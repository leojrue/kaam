(function () {
  const resultPanelElement = document.querySelector("#resultPanel");
  const result = KaamApi.getLatestResult();

  if (!result) {
    resultPanelElement.innerHTML = `
      <h2>暂无结果</h2>
      <p class="hint">请先完成一次答题。</p>
      <div class="actions"><a class="button" href="answer.html">去答题</a></div>
    `;
    return;
  }

  const escapeHtml = KaamTools.escapeHtml;
  resultPanelElement.innerHTML = `
    <div class="card-header">
      <div>
        <h2>${escapeHtml(result.bankTitle)}</h2>
        <p class="hint">${escapeHtml(result.answerName)} 的答题结果</p>
      </div>
      <span class="pill">${escapeHtml(result.rankName)}</span>
    </div>
    <div class="score-large">${result.score}/${result.totalScore}</div>
    <div class="pill-list">
      <span class="pill">答对 ${result.correctCount}</span>
      <span class="pill">答错 ${result.wrongCount}</span>
      <span class="pill">分享码 ${result.shareCode}</span>
    </div>
    <div class="review-list">
      ${result.detailList.map((item, index) => `
        <article class="review-item ${item.isCorrect ? "correct" : "wrong"}">
          <strong>第 ${index + 1} 题：${escapeHtml(item.title)}</strong>
          <p class="meta">你的答案：${escapeHtml(item.userAnswer || "未作答")}；正确答案：${escapeHtml(item.answer)}</p>
          <p>${escapeHtml(item.analysis || "暂无解析")}</p>
        </article>
      `).join("")}
    </div>
    <div class="actions">
      <a class="button" href="answer.html?code=${result.shareCode}">再答一次</a>
      <a class="button secondary" href="index.html">返回首页</a>
    </div>
  `;
})();
