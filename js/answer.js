(function () {
  const enterAnswerForm = document.querySelector("#enterAnswerForm");
  const enterAnswerSection = document.querySelector("#enterAnswerSection");
  const answerForm = document.querySelector("#answerForm");
  const answerStatusElement = document.querySelector("#answerStatus");
  const shareCodeInput = document.querySelector("#shareCodeInput");
  const answerNameInput = document.querySelector("#answerNameInput");
  const bankTitleElement = document.querySelector("#bankTitle");
  const bankDescriptionElement = document.querySelector("#bankDescription");
  const questionProgressElement = document.querySelector("#questionProgress");
  const answerQuestionListElement = document.querySelector("#answerQuestionList");
  const answerActionsElement = document.querySelector("#answerActions");

  let activeBank = null;

  function renderQuestionList(bank) {
    const escapeHtml = KaamTools.escapeHtml;
    bankTitleElement.textContent = bank.title;
    bankDescriptionElement.textContent = bank.description || "暂无题库描述";
    questionProgressElement.textContent = `${bank.questionList.length} 题 / ${bank.totalScore} 分`;
    answerQuestionListElement.innerHTML = "";
    answerActionsElement.innerHTML = "";

    bank.questionList.forEach((question, index) => {
      const card = KaamTools.createElement("article", "question-card");
      card.innerHTML = `
        <div class="question-top">
          <span class="question-number">第 ${index + 1} 题</span>
          <span class="pill">${question.score} 分</span>
        </div>
        <h2>${escapeHtml(question.title)}</h2>
        <div class="option-grid">
          ${question.option.map((optionText, optionIndex) => {
            const optionLetter = "ABCD"[optionIndex];
            return `
              <label class="option-choice">
                <input type="radio" name="question_${index}" value="${optionLetter}" required>
                <span>${escapeHtml(optionText)}</span>
              </label>
            `;
          }).join("")}
        </div>
      `;
      answerQuestionListElement.appendChild(card);
    });

    answerForm.hidden = false;
    const submitButton = KaamTools.createElement("button", "button", "提交答案");
    submitButton.type = "submit";
    answerActionsElement.appendChild(submitButton);
    if (enterAnswerSection) {
      enterAnswerSection.hidden = true;
    }
  }

  async function loadBankByCode(shareCode) {
    KaamTools.setStatus(answerStatusElement, "正在读取题库...", "");
    activeBank = await KaamApi.getQuestionBank(shareCode);
    renderQuestionList(activeBank);
    KaamTools.setStatus(answerStatusElement, "题库已加载。", "success");
  }

  enterAnswerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await loadBankByCode(shareCodeInput.value);
    } catch (error) {
      answerForm.hidden = true;
      KaamTools.setStatus(answerStatusElement, error.message, "error");
    }
  });

  answerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeBank) return;

    const userAnswer = activeBank.questionList.map((_, index) => {
      const selectedOption = answerForm.querySelector(`input[name="question_${index}"]:checked`);
      return selectedOption ? selectedOption.value : "";
    });

    if (userAnswer.some((answer) => !answer)) {
      KaamTools.setStatus(answerStatusElement, "请完成所有题目后再提交。", "error");
      return;
    }

    try {
      await KaamApi.submitAnswer({
        shareCode: activeBank.shareCode,
        answerName: answerNameInput.value,
        deviceId: KaamApi.getDeviceId(),
        userAnswer
      });
      location.href = "result.html";
    } catch (error) {
      KaamTools.setStatus(answerStatusElement, error.message, "error");
    }
  });

  const initialShareCode = KaamTools.getQueryParam("code");
  if (initialShareCode) {
    shareCodeInput.value = KaamApi.normalizeShareCode(initialShareCode);
    loadBankByCode(initialShareCode).catch((error) => {
      answerForm.hidden = true;
      if (enterAnswerSection) {
        enterAnswerSection.hidden = false;
      }
      KaamTools.setStatus(answerStatusElement, error.message, "error");
    });
  }
})();
