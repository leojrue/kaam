(function () {
  const STORAGE_KEYS = {
    questionBanks: "kaam.questionBanks",
    answerRecords: "kaam.answerRecords",
    latestResult: "kaam.latestResult",
    currentUser: "kaam.currentUser",
    deviceId: "kaam.deviceId",
    latestCreatedBank: "kaam.latestCreatedBank",
    pendingAuthRedirect: "kaam.pendingAuthRedirect"
  };

  const API_MODE = "remote";
  const API_BASE_URL = location.protocol === "file:" ? "http://127.0.0.1:8000/api" : "/api";
  const HTTP_METHODS = {
    get: "GET",
    post: "POST"
  };

  const defaultRankRules = [
    { minPercent: 90, maxPercent: 100, name: "满分大神" },
    { minPercent: 80, maxPercent: 89, name: "知识达人" },
    { minPercent: 60, maxPercent: 79, name: "合格选手" },
    { minPercent: 0, maxPercent: 59, name: "趣味小白" }
  ];

  function readJson(key, fallbackValue) {
    try {
      const rawValue = localStorage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : fallbackValue;
    } catch (error) {
      return fallbackValue;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeShareCode(shareCode) {
    return String(shareCode || "").trim().toUpperCase();
  }

  function createShareCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let shareCode = "";
    for (let index = 0; index < 6; index += 1) {
      shareCode += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return shareCode;
  }

  function getQuestionBanks() {
    return readJson(STORAGE_KEYS.questionBanks, []);
  }

  function saveQuestionBanks(questionBanks) {
    writeJson(STORAGE_KEYS.questionBanks, questionBanks);
  }

  function getAnswerRecords() {
    return readJson(STORAGE_KEYS.answerRecords, []);
  }

  function saveAnswerRecords(answerRecords) {
    writeJson(STORAGE_KEYS.answerRecords, answerRecords);
  }

  function sanitizeQuestionForPublic(question) {
    return {
      id: question.id,
      title: question.title,
      option: question.option,
      score: question.score,
      analysis: question.analysis || ""
    };
  }

  function calculateTotalScore(questionList) {
    return questionList.reduce((sum, question) => sum + Number(question.score || 0), 0);
  }

  function matchRankName(score, totalScore, rankRules) {
    if (!totalScore) return "未评级";
    const percent = Math.round((score / totalScore) * 100);
    const matchedRule = rankRules.find((rule) => percent >= Number(rule.minPercent) && percent <= Number(rule.maxPercent));
    return matchedRule ? matchedRule.name : "未评级";
  }

  function validateQuestion(question, index) {
    if (!question.title.trim()) {
      throw new Error(`第 ${index + 1} 题缺少题干`);
    }
    if (question.option.length !== 4 || question.option.some((optionText) => !optionText.trim())) {
      throw new Error(`第 ${index + 1} 题需要完整填写 4 个选项`);
    }
    if (!["A", "B", "C", "D"].includes(question.answer)) {
      throw new Error(`第 ${index + 1} 题需要选择正确答案`);
    }
    if (Number(question.score) <= 0) {
      throw new Error(`第 ${index + 1} 题分值必须大于 0`);
    }
  }

  async function requestApi(path, options = {}) {
    const method = options.method || HTTP_METHODS.get;
    const payload = options.payload;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: method === HTTP_METHODS.get ? undefined : JSON.stringify(payload || {})
    });

    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch (error) {
      responseBody = null;
    }

    if (!response.ok || responseBody?.success === false) {
      const message = responseBody?.message || responseBody?.error || responseBody?.detail || "服务请求失败";
      throw new Error(message);
    }

    return responseBody && Object.prototype.hasOwnProperty.call(responseBody, "data")
      ? responseBody.data
      : responseBody;
  }

  const KaamApi = {
    apiBaseUrl: API_BASE_URL,
    defaultRankRules,

    getCurrentUser() {
      return readJson(STORAGE_KEYS.currentUser, null);
    },

    setCurrentUser(user) {
      writeJson(STORAGE_KEYS.currentUser, user);
      window.dispatchEvent(new CustomEvent("kaam:user-change", { detail: user }));
      const pendingRedirect = localStorage.getItem(STORAGE_KEYS.pendingAuthRedirect);
      if (pendingRedirect) {
        localStorage.removeItem(STORAGE_KEYS.pendingAuthRedirect);
        location.href = pendingRedirect;
      }
    },

    logout() {
      localStorage.removeItem(STORAGE_KEYS.currentUser);
      window.dispatchEvent(new CustomEvent("kaam:user-change", { detail: null }));
    },

    requireLogin() {
      const user = this.getCurrentUser();
      if (!user) {
        window.dispatchEvent(new CustomEvent("kaam:open-login"));
        return null;
      }
      return user;
    },

    openLoginForRedirect(targetUrl) {
      localStorage.setItem(STORAGE_KEYS.pendingAuthRedirect, targetUrl);
      window.dispatchEvent(new CustomEvent("kaam:open-login"));
    },

    getDeviceId() {
      let deviceId = localStorage.getItem(STORAGE_KEYS.deviceId);
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(STORAGE_KEYS.deviceId, deviceId);
      }
      return deviceId;
    },

    getLatestCreatedBank() {
      return readJson(STORAGE_KEYS.latestCreatedBank, null);
    },

    setLatestCreatedBank(bank) {
      writeJson(STORAGE_KEYS.latestCreatedBank, bank);
    },

    clearLatestCreatedBank() {
      localStorage.removeItem(STORAGE_KEYS.latestCreatedBank);
    },

    setLatestResult(result) {
      writeJson(STORAGE_KEYS.latestResult, result);
    },

    async login(payload) {
      const user = await requestApi("/auth/login", {
        method: HTTP_METHODS.post,
        payload
      });
      this.setCurrentUser(user);
      return user;
    },

    async register(payload) {
      const user = await requestApi("/auth/register", {
        method: HTTP_METHODS.post,
        payload
      });
      this.setCurrentUser(user);
      return user;
    },

    async createQuestionBank(payload) {
      if (API_MODE !== "mock") {
        return requestApi("/question-banks", {
          method: HTTP_METHODS.post,
          payload
        });
      }

      const creatorName = String(payload.creatorName || "").trim();
      const creatorPassword = String(payload.creatorPassword || "").trim();
      const questionList = payload.questionList || [];
      const rankRules = payload.rankRules && payload.rankRules.length ? payload.rankRules : defaultRankRules;

      if (!creatorName) throw new Error("请填写出题人昵称");
      if (creatorPassword.length < 4) throw new Error("管理题库密码至少 4 位");
      if (!payload.title.trim()) throw new Error("请填写题库标题");
      if (!questionList.length) throw new Error("请至少添加 1 道题");
      questionList.forEach(validateQuestion);

      const questionBanks = getQuestionBanks();
      let shareCode = createShareCode();
      while (questionBanks.some((bank) => bank.share_code === shareCode)) {
        shareCode = createShareCode();
      }

      const now = Date.now();
      const savedBank = {
        share_code: shareCode,
        creator_name: creatorName,
        creator_pwd_hash: creatorPassword,
        title: payload.title.trim(),
        description: String(payload.description || "").trim(),
        question_list: questionList.map((question, index) => ({
          id: question.id || `q_${now}_${index}`,
          title: question.title.trim(),
          option: question.option.map((optionText) => optionText.trim()),
          answer: question.answer,
          score: Number(question.score),
          analysis: String(question.analysis || "").trim()
        })),
        rank_rule: {
          mode: "percent",
          rules: rankRules.map((rule) => ({
            minPercent: Number(rule.minPercent),
            maxPercent: Number(rule.maxPercent),
            name: String(rule.name || "").trim()
          }))
        },
        total_score: calculateTotalScore(questionList),
        status: "active",
        create_time: now,
        update_time: now,
        ai_generated_count: Number(payload.aiGeneratedCount || 0)
      };

      questionBanks.push(savedBank);
      saveQuestionBanks(questionBanks);

      return {
        shareCode,
        shareUrl: `${location.origin}${location.pathname.replace(/[^/]+$/, "")}answer.html?code=${shareCode}`
      };
    },

    async getCurrentUserQuestionBank(userId) {
      if (API_MODE !== "mock") {
        const response = await this.manageQuestionBank({
          action: "get",
          userId,
          shareCode: ""
        });
        return response.questionBank || null;
      }

      const questionBanks = getQuestionBanks();
      const bank = questionBanks.find((item) => item.user_id === userId && item.status === "active");
      if (!bank) return null;
      return {
        shareCode: bank.share_code,
        shareUrl: `${location.origin}${location.pathname.replace(/[^/]+$/, "")}answer.html?code=${bank.share_code}`,
        title: bank.title,
        description: bank.description,
        status: bank.status,
        createTime: bank.create_time,
        updateTime: bank.update_time
      };
    },

    async getQuestionBank(shareCode) {
      if (API_MODE !== "mock") {
        return requestApi(`/question-banks/${encodeURIComponent(normalizeShareCode(shareCode))}`);
      }

      const normalizedCode = normalizeShareCode(shareCode);
      const bank = getQuestionBanks().find((item) => item.share_code === normalizedCode && item.status === "active");
      if (!bank) throw new Error("未找到对应题库");

      return {
        shareCode: bank.share_code,
        creatorName: bank.creator_name,
        title: bank.title,
        description: bank.description,
        totalScore: bank.total_score,
        questionList: bank.question_list.map(sanitizeQuestionForPublic)
      };
    },

    async checkAnswerAccess(payload) {
      if (API_MODE !== "mock") {
        return requestApi("/answers/check-access", {
          method: HTTP_METHODS.post,
          payload
        });
      }

      const normalizedCode = normalizeShareCode(payload.shareCode);
      const answerRecords = getAnswerRecords();
      const hasAnswered = answerRecords.some((record) => (
        record.share_code === normalizedCode && record.device_id === payload.deviceId
      ));
      if (hasAnswered) throw new Error("你已经答过这套题了");
      return { canAnswer: true };
    },

    async submitAnswer(payload) {
      if (API_MODE !== "mock") {
        const result = await requestApi("/answers/submit", {
          method: HTTP_METHODS.post,
          payload
        });
        writeJson(STORAGE_KEYS.latestResult, result);
        return result;
      }

      const normalizedCode = normalizeShareCode(payload.shareCode);
      const answerName = String(payload.answerName || "").trim();
      const bank = getQuestionBanks().find((item) => item.share_code === normalizedCode && item.status === "active");
      if (!bank) throw new Error("未找到对应题库");
      if (!answerName) throw new Error("请填写答题人昵称");

      let score = 0;
      let correctCount = 0;
      const detailList = bank.question_list.map((question, index) => {
        const userAnswer = payload.userAnswer[index] || "";
        const isCorrect = userAnswer === question.answer;
        if (isCorrect) {
          score += Number(question.score);
          correctCount += 1;
        }
        return {
          title: question.title,
          option: question.option,
          answer: question.answer,
          userAnswer,
          score: Number(question.score),
          analysis: question.analysis || "",
          isCorrect
        };
      });

      const wrongCount = bank.question_list.length - correctCount;
      const rankName = matchRankName(score, bank.total_score, bank.rank_rule.rules);
      const result = {
        shareCode: normalizedCode,
        bankTitle: bank.title,
        answerName,
        score,
        totalScore: bank.total_score,
        correctCount,
        wrongCount,
        rankName,
        detailList,
        submitTime: Date.now()
      };

      const answerRecords = getAnswerRecords();
      answerRecords.push({
        share_code: normalizedCode,
        answer_name: answerName,
        user_answer: payload.userAnswer,
        score,
        correct_count: correctCount,
        wrong_count: wrongCount,
        rank_name: rankName,
        submit_time: result.submitTime
      });
      saveAnswerRecords(answerRecords);
      writeJson(STORAGE_KEYS.latestResult, result);

      return result;
    },

    async manageQuestionBank(payload) {
      if (API_MODE !== "mock") {
        return requestApi("/question-banks/manage", {
          method: HTTP_METHODS.post,
          payload
        });
      }

      const normalizedCode = normalizeShareCode(payload.shareCode);
      const questionBanks = getQuestionBanks();
      const bankIndex = questionBanks.findIndex((item) => item.share_code === normalizedCode);
      if (bankIndex < 0) throw new Error("未找到对应题库");
      if (questionBanks[bankIndex].creator_pwd_hash !== String(payload.creatorPassword || "")) {
        throw new Error("管理题库密码不正确");
      }

      if (payload.action === "delete") {
        questionBanks[bankIndex].status = "deleted";
        questionBanks[bankIndex].update_time = Date.now();
        saveQuestionBanks(questionBanks);
        return { ok: true };
      }

      return {
        shareCode: questionBanks[bankIndex].share_code,
        title: questionBanks[bankIndex].title,
        description: questionBanks[bankIndex].description,
        creatorName: questionBanks[bankIndex].creator_name,
        questionCount: questionBanks[bankIndex].question_list.length,
        totalScore: questionBanks[bankIndex].total_score,
        createTime: questionBanks[bankIndex].create_time,
        updateTime: questionBanks[bankIndex].update_time
      };
    },

    async aiProxy(payload) {
      if (API_MODE !== "mock") {
        return requestApi("/ai/generate", {
          method: HTTP_METHODS.post,
          payload
        });
      }

      const topic = String(payload.topic || payload.title || "KAAM").trim();
      const count = Math.max(1, Math.min(Number(payload.count || 3), 10));
      const questionList = Array.from({ length: count }).map((_, index) => ({
        id: `ai_${Date.now()}_${index}`,
        title: `${topic} 相关单选题 ${index + 1}`,
        option: ["A. 选项一", "B. 选项二", "C. 选项三", "D. 选项四"],
        answer: "A",
        score: 5,
        analysis: "你可以根据实际活动内容继续调整这道题。"
      }));
      return { questionList };
    },

    getLatestResult() {
      return readJson(STORAGE_KEYS.latestResult, null);
    },

    normalizeShareCode
  };

  window.KaamApi = KaamApi;

  function createAuthModal() {
    if (document.querySelector("#authModal")) return;
    const modal = document.createElement("div");
    modal.id = "authModal";
    modal.className = "auth-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="auth-panel">
        <button class="icon-button auth-close" type="button" aria-label="关闭">×</button>
        <span class="eyebrow">账号登录</span>
        <h2 id="authTitle">登录 KAAM</h2>
        <p class="hint">登录后即可创建题库、管理题库和查看答题记录。</p>
        <form id="authForm" class="stack">
          <div class="field">
            <label for="authAccount">账号</label>
            <input id="authAccount" name="account" maxlength="50" required autocomplete="username">
          </div>
          <div class="field">
            <label for="authPassword">密码</label>
            <input id="authPassword" name="password" type="password" minlength="4" maxlength="64" required autocomplete="current-password">
          </div>
          <button id="authSubmitButton" class="button" type="submit">登录</button>
        </form>
        <button id="authSwitchButton" class="button ghost" type="button">没有账号？注册一个</button>
        <div id="authStatus" class="status" role="status"></div>
      </div>
    `;
    document.body.appendChild(modal);

    let authMode = "login";
    const authForm = modal.querySelector("#authForm");
    const authTitle = modal.querySelector("#authTitle");
    const authSubmitButton = modal.querySelector("#authSubmitButton");
    const authSwitchButton = modal.querySelector("#authSwitchButton");
    const authStatus = modal.querySelector("#authStatus");

    function setAuthMode(nextMode) {
      authMode = nextMode;
      authTitle.textContent = authMode === "login" ? "登录 KAAM" : "注册账号";
      authSubmitButton.textContent = authMode === "login" ? "登录" : "注册并登录";
      authSwitchButton.textContent = authMode === "login" ? "没有账号？注册一个" : "已有账号？去登录";
      authStatus.textContent = "";
      authStatus.className = "status";
    }

    function closeModal() {
      modal.hidden = true;
      localStorage.removeItem(STORAGE_KEYS.pendingAuthRedirect);
      if (document.body.dataset.requiresAuth === "true" && !KaamApi.getCurrentUser()) {
        location.href = "index.html";
      }
    }

    modal.querySelector(".auth-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    authSwitchButton.addEventListener("click", () => setAuthMode(authMode === "login" ? "register" : "login"));
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(authForm).entries());
      authStatus.textContent = authMode === "login" ? "正在登录..." : "正在注册...";
      authStatus.className = "status";
      try {
        if (authMode === "login") {
          await KaamApi.login(payload);
        } else {
          await KaamApi.register(payload);
        }
        authStatus.textContent = "登录成功";
        authStatus.className = "status success";
        closeModal();
      } catch (error) {
        authStatus.textContent = error.message;
        authStatus.className = "status error";
      }
    });

    window.addEventListener("kaam:open-login", () => {
      setAuthMode("login");
      modal.hidden = false;
      setTimeout(() => modal.querySelector("#authAccount").focus(), 0);
    });
  }

  function renderAuthButton() {
    const nav = document.querySelector(".nav-links");
    if (!nav) return;
    let authSlot = document.querySelector("#authSlot");
    if (!authSlot) {
      authSlot = document.createElement("div");
      authSlot.id = "authSlot";
      authSlot.className = "auth-slot";
      nav.appendChild(authSlot);
    }
    const user = KaamApi.getCurrentUser();
    if (!user) {
      authSlot.innerHTML = `<button class="login-button" type="button">登录</button>`;
      authSlot.querySelector("button").addEventListener("click", () => window.dispatchEvent(new CustomEvent("kaam:open-login")));
      return;
    }
    authSlot.innerHTML = `
      <button class="avatar-button" type="button" title="${user.account}">${user.avatarText || user.account.slice(0, 1).toUpperCase()}</button>
      <div class="avatar-menu" hidden>
        <strong>${user.account}</strong>
        <button type="button">退出登录</button>
      </div>
    `;
    const avatarButton = authSlot.querySelector(".avatar-button");
    const menu = authSlot.querySelector(".avatar-menu");
    avatarButton.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener("click", (event) => {
      if (!authSlot.contains(event.target)) {
        menu.hidden = true;
      }
    });
    menu.querySelector("button").addEventListener("click", () => {
      KaamApi.logout();
      menu.hidden = true;
      if (document.body.dataset.requiresAuth === "true") {
        location.href = "index.html";
      }
    });
  }

  function bindProtectedLinks() {
    document.querySelectorAll("a[href='create.html'], a[href='manage.html']").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (KaamApi.getCurrentUser()) return;
        event.preventDefault();
        KaamApi.openLoginForRedirect(link.getAttribute("href"));
      });
    });
  }

  function setProtectedPageVisible(isVisible) {
    if (document.body.dataset.requiresAuth !== "true") return;
    document.body.classList.toggle("auth-required-locked", !isVisible);
    document.querySelectorAll("main.main").forEach((mainElement) => {
      mainElement.hidden = !isVisible;
    });
  }

  function protectCurrentPage() {
    if (document.body.dataset.requiresAuth !== "true") return;
    if (KaamApi.getCurrentUser()) {
      setProtectedPageVisible(true);
      return;
    }
    setProtectedPageVisible(false);
    const currentPage = location.pathname.split("/").pop() || "index.html";
    KaamApi.openLoginForRedirect(currentPage);
  }

  document.addEventListener("DOMContentLoaded", () => {
    createAuthModal();
    renderAuthButton();
    bindProtectedLinks();
    protectCurrentPage();
    window.addEventListener("kaam:user-change", (event) => {
      renderAuthButton();
      setProtectedPageVisible(Boolean(event.detail));
    });
  });
})();
