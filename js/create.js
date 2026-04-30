(function () {
  const questionListElement = document.querySelector("#questionList");
  const rankRuleListElement = document.querySelector("#rankRuleList");
  const questionBankForm = document.querySelector("#questionBankForm");
  const createStatusElement = document.querySelector("#createStatus");
  const shareBoxElement = document.querySelector("#shareBox");
  const shareCodeElement = document.querySelector("#shareCode");
  const shareLinkElement = document.querySelector("#shareLink");
  const copyShareButton = document.querySelector("#copyShareButton");
  const addQuestionButton = document.querySelector("#addQuestionButton");
  const addRankRuleButton = document.querySelector("#addRankRuleButton");
  const generateAiButton = document.querySelector("#generateAiButton");
  const aiTopicInput = document.querySelector("#aiTopic");
  const aiCountInput = document.querySelector("#aiCount");

  let questionList = [];
  let rankRules = KaamApi.defaultRankRules.map((rule) => ({ ...rule }));
  let lastShareUrl = "";

  function createEmptyQuestion() {
    return {
      id: `q_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      title: "",
      option: ["", "", "", ""],
      answer: "A",
      score: 5,
      analysis: ""
    };
  }

  function updateQuestion(index, key, value, optionIndex) {
    if (key === "option") {
      questionList[index].option[optionIndex] = value;
      return;
    }
    questionList[index][key] = value;
  }

  function renderQuestions() {
    const escapeHtml = KaamTools.escapeHtml;
    questionListElement.innerHTML = "";

    if (!questionList.length) {
      questionListElement.appendChild(KaamTools.createElement("p", "empty-state", "还没有题目，点击新增题目开始。"));
      return;
    }

    questionList.forEach((question, index) => {
      const card = KaamTools.createElement("article", "question-card");
      card.innerHTML = `
        <div class="question-top">
          <span class="question-number">第 ${index + 1} 题</span>
          <div>
            <button class="icon-button" type="button" data-action="up" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
            <button class="icon-button" type="button" data-action="down" title="下移" ${index === questionList.length - 1 ? "disabled" : ""}>↓</button>
            <button class="icon-button" type="button" data-action="delete" title="删除">×</button>
          </div>
        </div>
        <div class="form-grid">
          <div class="field full">
            <label>题干</label>
            <textarea data-key="title" maxlength="200" required>${escapeHtml(question.title)}</textarea>
          </div>
          ${question.option.map((optionText, optionIndex) => `
            <div class="field">
              <label>选项 ${"ABCD"[optionIndex]}</label>
              <input data-key="option" data-option-index="${optionIndex}" maxlength="120" value="${escapeHtml(optionText)}">
            </div>
          `).join("")}
          <div class="field">
            <label>正确答案</label>
            <select data-key="answer">
              ${["A", "B", "C", "D"].map((letter) => `<option value="${letter}" ${question.answer === letter ? "selected" : ""}>${letter}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>分值</label>
            <input data-key="score" type="number" min="1" max="100" value="${question.score}">
          </div>
          <div class="field full">
            <label>解析</label>
            <textarea data-key="analysis" maxlength="240">${escapeHtml(question.analysis)}</textarea>
          </div>
        </div>
      `;

      card.addEventListener("input", (event) => {
        const target = event.target;
        const key = target.dataset.key;
        if (!key) return;
        updateQuestion(index, key, target.value, Number(target.dataset.optionIndex));
      });

      card.addEventListener("change", (event) => {
        const target = event.target;
        const key = target.dataset.key;
        if (!key) return;
        updateQuestion(index, key, key === "score" ? Number(target.value) : target.value, Number(target.dataset.optionIndex));
      });

      card.addEventListener("click", (event) => {
        const action = event.target.dataset.action;
        if (!action) return;
        if (action === "delete") questionList.splice(index, 1);
        if (action === "up" && index > 0) [questionList[index - 1], questionList[index]] = [questionList[index], questionList[index - 1]];
        if (action === "down" && index < questionList.length - 1) [questionList[index], questionList[index + 1]] = [questionList[index + 1], questionList[index]];
        renderQuestions();
      });

      questionListElement.appendChild(card);
    });
  }

  function renderRankRules() {
    const escapeHtml = KaamTools.escapeHtml;
    rankRuleListElement.innerHTML = "";
    rankRules.forEach((rule, index) => {
      const row = KaamTools.createElement("div", "rank-row");
      row.innerHTML = `
        <div class="field">
          <label>最低百分比</label>
          <input type="number" min="0" max="100" value="${rule.minPercent}" data-key="minPercent">
        </div>
        <div class="field">
          <label>最高百分比</label>
          <input type="number" min="0" max="100" value="${rule.maxPercent}" data-key="maxPercent">
        </div>
        <div class="field">
          <label>称号</label>
          <input maxlength="24" value="${escapeHtml(rule.name)}" data-key="name">
        </div>
        <button class="icon-button" type="button" data-action="delete" title="删除">×</button>
      `;

      row.addEventListener("input", (event) => {
        const key = event.target.dataset.key;
        if (!key) return;
        rankRules[index][key] = key === "name" ? event.target.value : Number(event.target.value);
      });

      row.addEventListener("click", (event) => {
        if (event.target.dataset.action === "delete") {
          rankRules.splice(index, 1);
          renderRankRules();
        }
      });

      rankRuleListElement.appendChild(row);
    });
  }

  addQuestionButton.addEventListener("click", () => {
    questionList.push(createEmptyQuestion());
    renderQuestions();
  });

  addRankRuleButton.addEventListener("click", () => {
    rankRules.push({ minPercent: 0, maxPercent: 100, name: "新称号" });
    renderRankRules();
  });

  generateAiButton.addEventListener("click", async () => {
    KaamTools.setStatus(createStatusElement, "正在生成题目...", "");
    try {
      const response = await KaamApi.aiProxy({
        action: "generate",
        topic: aiTopicInput.value,
        count: aiCountInput.value
      });
      questionList = questionList.concat(response.questionList);
      renderQuestions();
      KaamTools.setStatus(createStatusElement, "AI 演示题目已添加。", "success");
    } catch (error) {
      KaamTools.setStatus(createStatusElement, error.message, "error");
    }
  });

  questionBankForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = KaamTools.serializeForm(questionBankForm);
    KaamTools.setStatus(createStatusElement, "正在保存题库...", "");

    try {
      const response = await KaamApi.createQuestionBank({
        creatorName: formData.creatorName,
        creatorPassword: formData.creatorPassword,
        title: formData.bankTitle,
        description: formData.bankDescription,
        questionList,
        rankRules,
        aiGeneratedCount: questionList.filter((question) => question.id.startsWith("ai_")).length
      });

      lastShareUrl = response.shareUrl;
      shareCodeElement.textContent = response.shareCode;
      shareLinkElement.href = response.shareUrl;
      shareBoxElement.classList.add("active");
      KaamTools.setStatus(createStatusElement, "题库创建成功。", "success");
    } catch (error) {
      KaamTools.setStatus(createStatusElement, error.message, "error");
    }
  });

  copyShareButton.addEventListener("click", async () => {
    if (!lastShareUrl) return;
    await KaamTools.copyText(lastShareUrl);
    KaamTools.setStatus(createStatusElement, "分享链接已复制。", "success");
  });

  questionList.push(createEmptyQuestion());
  renderQuestions();
  renderRankRules();
})();
