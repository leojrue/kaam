(function () {
  const manageForm = document.querySelector("#manageForm");
  const deleteBankButton = document.querySelector("#deleteBankButton");
  const manageStatusElement = document.querySelector("#manageStatus");
  const manageResultElement = document.querySelector("#manageResult");

  async function runManageAction(action) {
    const formData = KaamTools.serializeForm(manageForm);
    KaamTools.setStatus(manageStatusElement, "正在处理...", "");
    try {
      const response = await KaamApi.manageQuestionBank({
        action,
        shareCode: formData.shareCode,
        creatorPassword: formData.creatorPassword
      });

      if (action === "delete") {
        manageResultElement.hidden = true;
        KaamTools.setStatus(manageStatusElement, "题库已删除。", "success");
        return;
      }

      const escapeHtml = KaamTools.escapeHtml;
      manageResultElement.hidden = false;
      manageResultElement.innerHTML = `
        <h2>${escapeHtml(response.title)}</h2>
        <p class="hint">${escapeHtml(response.description || "暂无描述")}</p>
        <div class="pill-list">
          <span class="pill">分享码 ${response.shareCode}</span>
          <span class="pill">${response.questionCount} 题</span>
          <span class="pill">${response.totalScore} 分</span>
          <span class="pill">出题人 ${escapeHtml(response.creatorName)}</span>
        </div>
      `;
      KaamTools.setStatus(manageStatusElement, "题库摘要已读取。", "success");
    } catch (error) {
      manageResultElement.hidden = true;
      KaamTools.setStatus(manageStatusElement, error.message, "error");
    }
  }

  manageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runManageAction("get");
  });

  deleteBankButton.addEventListener("click", () => {
    const confirmed = window.confirm("确认删除这个题库吗？删除后分享码将不可继续答题。");
    if (confirmed) {
      runManageAction("delete");
    }
  });
})();
