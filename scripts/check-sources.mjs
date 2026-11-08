/*
 * Vigia as fontes de dados (/api/health/sources). Quando alguma está em
 * baixo ou desatualizada em duas verificações seguidas (com 10 min de
 * intervalo, para não alertar por falhas de um minuto), abre uma issue
 * no GitHub, o que manda um email ao dono do repositório. Quando tudo
 * volta ao normal, comenta e fecha a issue. Uma issue por avaria: sem
 * emails repetidos a cada verificação.
 *
 * Corre no GitHub Actions (ver .github/workflows/sources.yml), com
 * GITHUB_TOKEN e GITHUB_REPOSITORY. Sem eles, só escreve o relatório.
 */

const SITE = process.env.SITE_URL ?? "https://portugalagora.pt";
const RETRY_MS = Number(process.env.RETRY_MS ?? 10 * 60_000);
const LABEL = "fonte-em-baixo";
const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;

async function report() {
  try {
    const response = await fetch(`${SITE}/api/health/sources`, {
      headers: { "user-agent": "portugal-agora-source-check" },
    });
    const body = await response.json();
    const bad = body.sources.filter((s) => s.health !== "ok");
    return { ok: response.ok && bad.length === 0, bad, error: null };
  } catch (error) {
    // O próprio site em baixo também é uma avaria.
    return { ok: false, bad: [], error: String(error) };
  }
}

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  return response.json();
}

function describe(r) {
  if (r.error) return `O site não respondeu: ${r.error}`;
  return r.bad
    .map(
      (s) =>
        `- **${s.id}**: ${s.health} (estado ${s.status}, dados com ${s.ageMinutes ?? "?"} min; máximo ${s.maxAgeMinutes} min)`,
    )
    .join("\n");
}

let result = await report();
if (!result.ok) {
  console.log("Primeira verificação falhou; nova tentativa daqui a", RETRY_MS / 60_000, "min.");
  console.log(describe(result));
  await new Promise((r) => setTimeout(r, RETRY_MS));
  result = await report();
}
console.log(result.ok ? "Todas as fontes estão bem." : describe(result));

process.exitCode = result.ok ? 0 : 1;
if (token && repo) await syncIssue(result);

async function syncIssue(result) {
  const open = await github(`/issues?state=open&labels=${LABEL}&per_page=1`);
  const issue = open[0];
  const when = new Date().toISOString();

  if (!result.ok && !issue) {
    await github("/issues", {
      method: "POST",
      body: JSON.stringify({
        title: `Fonte de dados em baixo (${result.error ? "site" : result.bad.map((s) => s.id).join(", ")})`,
        labels: [LABEL],
        body: `Detetado às ${when}, em duas verificações seguidas:\n\n${describe(result)}\n\n${SITE}/api/health/sources\n\nEsta issue fecha-se sozinha quando as fontes voltarem.`,
      }),
    });
    console.log("Issue aberta.");
  } else if (result.ok && issue) {
    await github(`/issues/${issue.number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: `Tudo normal outra vez às ${when}.` }),
    });
    await github(`/issues/${issue.number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    });
    console.log(`Issue #${issue.number} fechada.`);
  }
}
