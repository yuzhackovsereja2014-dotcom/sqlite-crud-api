const health = document.querySelector("#health");
const status = document.querySelector(".status");
const responseCode = document.querySelector("#response-code");
const responseJson = document.querySelector("#response-json");
const latency = document.querySelector("#latency");
const items = document.querySelector("#items");

async function request(path, options) {
  const started = performance.now();
  const response = await fetch(path, options);
  const data = await response.json();
  latency.textContent = `${Math.round(performance.now() - started)} ms`;
  responseCode.textContent = `${response.status} ${response.statusText}`;
  responseJson.textContent = JSON.stringify(data, null, 2);
  return { response, data };
}

function renderItems(records) {
  if (!records.length) {
    items.innerHTML = '<p class="empty">Записей пока нет</p>';
    return;
  }
  items.replaceChildren(...records.map((record) => {
    const row = document.createElement("article");
    row.className = "item";

    const id = document.createElement("span");
    id.className = "item-id";
    id.textContent = `#${record.id}`;

    const copy = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = record.title;
    const description = document.createElement("p");
    description.textContent = record.description || "Без описания";
    copy.append(title, description);

    const remove = document.createElement("button");
    remove.className = "delete";
    remove.type = "button";
    remove.textContent = "Удалить";
    remove.addEventListener("click", async () => {
      await request(`/items/${record.id}`, { method: "DELETE" });
      await loadItems();
    });

    row.append(id, copy, remove);
    return row;
  }));
}

async function loadItems() {
  const { data } = await request("/items");
  renderItems(data.items || []);
}

document.querySelector("#create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const { response } = await request("/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: document.querySelector("#title").value,
      description: document.querySelector("#description").value
    })
  });
  if (response.ok) await loadItems();
});

document.querySelector("#refresh").addEventListener("click", loadItems);

try {
  const response = await fetch("/health");
  if (!response.ok) throw new Error("API недоступен");
  status.classList.add("ok");
  health.textContent = "API работает";
  await loadItems();
} catch {
  status.classList.add("error");
  health.textContent = "API недоступен";
}
