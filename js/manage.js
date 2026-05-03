(function () {
  const refreshManageButton = document.querySelector("#refreshManageButton");
  const manageStatusElement = document.querySelector("#manageStatus");
  const bankListElement = document.querySelector("#bankList");
  const recordListElement = document.querySelector("#recordList");
  const recordScopeElement = document.querySelector("#recordScope");

  let selectedShareCode = "";

  if (!KaamApi.getCurrentUser()) {
    bankListElement.innerHTML = `<p class="empty-state">请先登录后管理题库。</p>`;
    recordListElement.innerHTML = `<p class="empty-state">登录后可查看答题记录。</p>`;
  }

  function requireManageUser() {
    return KaamApi.requireLogin();
  }

  function formatTime(timestamp) {
    if (!timestamp) return "暂无时间";
    return new Date(Number(timestamp)).toLocaleString("zh-CN");
  }

  async function loadBanks() {
    const user = requireManageUser();
    if (!user) return;
    KaamTools.setStatus(manageStatusElement, "正在读取题库...", "");
    try {
      const response = await KaamApi.manageQuestionBank({
        action: "list",
        userId: user.userId
      });
      renderBanks(response.questionBanks || []);
      KaamTools.setStatus(manageStatusElement, "题库已更新。", "success");
      await loadRecords(selectedShareCode);
    } catch (error) {
      KaamTools.setStatus(manageStatusElement, error.message, "error");
    }
  }

  async function loadRecords(shareCode = "") {
    const user = requireManageUser();
    if (!user) return;
    const response = await KaamApi.manageQuestionBank({
      action: "records",
      userId: user.userId,
      shareCode
    });
    renderRecords(response.answerRecords || []);
  }

  function renderBanks(questionBanks) {
    const escapeHtml = KaamTools.escapeHtml;
    if (!questionBanks.length) {
      bankListElement.innerHTML = `<p class="empty-state">你还没有创建题库。</p>`;
      return;
    }
    bankListElement.innerHTML = questionBanks.map((bank) => `
      <article class="manage-item">
        <div>
          <strong>${escapeHtml(bank.title)}</strong>
          <p class="hint">${escapeHtml(bank.description || "暂无描述")}</p>
          <div class="pill-list">
            <span class="pill">分享码 ${escapeHtml(bank.shareCode)}</span>
            <span class="pill">${bank.totalScore} 分</span>
            <span class="pill">${bank.status === "active" ? "进行中" : "已停止"}</span>
          </div>
        </div>
        <div class="actions">
          <button class="button secondary" type="button" data-action="records" data-code="${escapeHtml(bank.shareCode)}">查看记录</button>
          <button class="button secondary" type="button" data-action="edit" data-code="${escapeHtml(bank.shareCode)}">编辑题库</button>
          <button class="button danger" type="button" data-action="delete" data-code="${escapeHtml(bank.shareCode)}">删除题库</button>
        </div>
      </article>
    `).join("");
  }

  function renderRecords(records) {
    const escapeHtml = KaamTools.escapeHtml;
    recordScopeElement.textContent = selectedShareCode ? `分享码 ${selectedShareCode}` : "全部题库";
    if (!records.length) {
      recordListElement.innerHTML = `<p class="empty-state">暂无答题记录。</p>`;
      return;
    }
    recordListElement.innerHTML = records.map((record) => `
      <article class="manage-item">
        <div>
          <strong>${escapeHtml(record.answerName)} - ${escapeHtml(record.bankTitle)}</strong>
          <p class="hint">${formatTime(record.submitTime)}</p>
          <div class="pill-list">
            <span class="pill">分享码 ${escapeHtml(record.shareCode)}</span>
            <span class="pill">${record.score} 分</span>
            <span class="pill">答对 ${record.correctCount}</span>
            <span class="pill">答错 ${record.wrongCount}</span>
            <span class="pill">${escapeHtml(record.rankName)}</span>
          </div>
          <p class="meta">答案：${escapeHtml((record.userAnswer || []).join(" / "))}</p>
        </div>
      </article>
    `).join("");
  }

  bankListElement.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const shareCode = button.dataset.code;
    const user = requireManageUser();
    if (!user) return;

    if (action === "records") {
      selectedShareCode = selectedShareCode === shareCode ? "" : shareCode;
      await loadRecords(selectedShareCode);
      return;
    }

    if (action === "edit") {
      await openEditPanel(user.userId, shareCode);
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm("确认删除这个题库吗？删除后分享码将不可继续答题。");
      if (!confirmed) return;
      await KaamApi.manageQuestionBank({
        action: "delete",
        userId: user.userId,
        shareCode
      });
      if (selectedShareCode === shareCode) selectedShareCode = "";
      await loadBanks();
    }
  });

  async function openEditPanel(userId, shareCode) {
    const bank = await KaamApi.manageQuestionBank({
      action: "get",
      userId,
      shareCode
    });
    const escapeHtml = KaamTools.escapeHtml;
    const existingPanel = document.querySelector("#editBankPanel");
    if (existingPanel) existingPanel.remove();
    const panel = document.createElement("section");
    panel.id = "editBankPanel";
    panel.className = "card";
    panel.innerHTML = `
      <div class="card-header">
        <h2>编辑题库</h2>
        <span class="pill">${escapeHtml(shareCode)}</span>
      </div>
      <form id="editBankForm" class="stack">
        <div class="field">
          <label for="editTitle">题库标题</label>
          <input id="editTitle" name="title" maxlength="60" value="${escapeHtml(bank.title)}" required>
        </div>
        <div class="field">
          <label for="editDescription">题库描述</label>
          <textarea id="editDescription" name="description" maxlength="240">${escapeHtml(bank.description || "")}</textarea>
        </div>
        <div class="field">
          <label for="editQuestions">题目 JSON</label>
          <textarea id="editQuestions" name="questionList" class="code-textarea" required>${escapeHtml(JSON.stringify(bank.questionList || [], null, 2))}</textarea>
        </div>
        <div class="field">
          <label for="editRanks">称号规则 JSON</label>
          <textarea id="editRanks" name="rankRules" class="code-textarea" required>${escapeHtml(JSON.stringify(bank.rankRules || [], null, 2))}</textarea>
        </div>
        <div class="actions">
          <button class="button" type="submit">保存修改</button>
          <button class="button secondary" type="button" data-action="cancel-edit">取消</button>
        </div>
        <div id="editStatus" class="status"></div>
      </form>
    `;
    document.querySelector("main.main").appendChild(panel);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });

    panel.querySelector("[data-action='cancel-edit']").addEventListener("click", () => panel.remove());
    panel.querySelector("#editBankForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const editStatus = panel.querySelector("#editStatus");
      const formData = KaamTools.serializeForm(event.currentTarget);
      try {
        const questionList = JSON.parse(formData.questionList);
        const rankRules = JSON.parse(formData.rankRules);
        await KaamApi.manageQuestionBank({
          action: "update",
          userId,
          shareCode,
          title: formData.title,
          description: formData.description,
          questionList,
          rankRules
        });
        KaamTools.setStatus(editStatus, "题库已更新。", "success");
        await loadBanks();
      } catch (error) {
        KaamTools.setStatus(editStatus, error.message, "error");
      }
    });
  }

  refreshManageButton.addEventListener("click", loadBanks);
  window.addEventListener("kaam:user-change", loadBanks);
  if (KaamApi.getCurrentUser()) {
    loadBanks();
  } else {
    KaamApi.requireLogin();
  }
})();
