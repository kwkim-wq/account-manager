// --- 상태 ---
let members = [];
let accounts = [];
let selectedMember = null;
let selectedAccount = null;
let passwordTimer = null;

// --- DOM ---
const $ = (id) => document.getElementById(id);

const steps = {
  member: $("step-member"),
  account: $("step-account"),
  verify: $("step-verify"),
  result: $("step-result"),
};

// --- 스텝 전환 ---

function showStep(name) {
  Object.values(steps).forEach((el) => el.classList.remove("active"));
  steps[name].classList.add("active");
}

// --- API 호출 ---

async function apiCall(method, endpoint, body) {
  showLoading(true);
  hideError();
  try {
    const result = await window.api.request({ method, endpoint, body });
    if (result.status >= 400) {
      const msg = result.data?.detail || "요청 실패";
      showError(msg);
      return null;
    }
    return result.data;
  } catch (err) {
    showError("서버에 연결할 수 없습니다");
    return null;
  } finally {
    showLoading(false);
  }
}

// --- 에러/로딩 ---

function showError(msg) {
  const box = $("error-box");
  box.textContent = msg;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 4000);
}

function hideError() {
  $("error-box").classList.add("hidden");
}

function showLoading(show) {
  $("loading").classList.toggle("hidden", !show);
}

// --- 1단계: 팀원/계정 로드 ---

async function init() {
  const [membersData, accountsData] = await Promise.all([
    apiCall("GET", "/api/members"),
    apiCall("GET", "/api/accounts"),
  ]);

  if (membersData) {
    members = membersData.members;
    const select = $("member-select");
    members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      select.appendChild(opt);
    });
  }

  if (accountsData) {
    accounts = accountsData.accounts;
  }
}

$("member-select").addEventListener("change", (e) => {
  selectedMember = e.target.value;
  if (selectedMember) {
    renderAccounts();
    showStep("account");
  }
});

// --- 2단계: 계정 목록 ---

function renderAccounts() {
  const list = $("account-list");
  list.innerHTML = "";

  const categories = {};
  accounts.forEach((acc) => {
    const cat = acc.category || "기타";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(acc);
  });

  Object.entries(categories).forEach(([cat, accs]) => {
    const catLabel = document.createElement("div");
    catLabel.className = "account-category";
    catLabel.textContent = cat;
    list.appendChild(catLabel);

    accs.forEach((acc) => {
      const item = document.createElement("div");
      item.className = "account-item";
      item.innerHTML = `
        <div>
          <div class="name">${acc.name}</div>
          <div class="username">${acc.username}</div>
        </div>
        <div class="arrow">›</div>
      `;
      item.addEventListener("click", () => requestCode(acc));
      list.appendChild(item);
    });
  });
}

// --- 3단계: 인증코드 요청 ---

async function requestCode(account) {
  selectedAccount = account;

  const data = await apiCall("POST", "/api/request-code", {
    member_id: selectedMember,
    account_id: account.id,
  });

  if (data) {
    showStep("verify");
    $("code-input").value = "";
    $("code-input").focus();
  }
}

$("btn-verify").addEventListener("click", verify);
$("code-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") verify();
});

async function verify() {
  const code = $("code-input").value.trim();
  if (code.length !== 6) {
    showError("6자리 코드를 입력해주세요");
    return;
  }

  const data = await apiCall("POST", "/api/verify", {
    member_id: selectedMember,
    account_id: selectedAccount.id,
    code,
  });

  if (data) {
    showPassword(data);
  }
}

$("btn-resend").addEventListener("click", () => {
  if (selectedAccount) requestCode(selectedAccount);
});

// --- 4단계: 계정 정보 표시 ---

let currentCredentials = null;

function showPassword(credentials) {
  showStep("result");
  currentCredentials = credentials;
  $("result-account-name").textContent = selectedAccount.name;
  $("username-text").textContent = credentials.username || "—";
  $("password-text").textContent = credentials.password;

  let remaining = 30;
  const bar = $("timer-bar");
  const seconds = $("timer-seconds");
  bar.style.width = "100%";

  if (passwordTimer) clearInterval(passwordTimer);

  passwordTimer = setInterval(() => {
    remaining--;
    seconds.textContent = remaining;
    bar.style.width = `${(remaining / 30) * 100}%`;

    if (remaining <= 0) {
      clearInterval(passwordTimer);
      $("username-text").textContent = "—";
      $("password-text").textContent = "••••••••";
      currentCredentials = null;
      showStep("account");
    }
  }, 1000);
}

$("btn-copy-username").addEventListener("click", async () => {
  if (currentCredentials?.username) {
    await window.api.copyToClipboard(currentCredentials.username);
    $("btn-copy-username").textContent = "✅";
    setTimeout(() => ($("btn-copy-username").textContent = "📋"), 2000);
  }
});

$("btn-copy-password").addEventListener("click", async () => {
  if (currentCredentials?.password) {
    await window.api.copyToClipboard(currentCredentials.password);
    $("btn-copy-password").textContent = "✅";
    setTimeout(() => ($("btn-copy-password").textContent = "📋"), 2000);
  }
});

$("btn-back").addEventListener("click", () => {
  if (passwordTimer) clearInterval(passwordTimer);
  $("username-text").textContent = "—";
  $("password-text").textContent = "••••••••";
  currentCredentials = null;
  showStep("account");
});

// --- 시작 ---
init();
