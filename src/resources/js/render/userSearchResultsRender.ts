import type { PaginatedResponse, User } from "../types/api";

type MessageVariant = "info" | "warning" | "danger" | "secondary";

function getResultsContainer(): HTMLDivElement | null {
  return document.querySelector<HTMLDivElement>("#assign-search-results");
}

/** Mostra uma mensagem no lugar dos resultados (texto vazio, nenhum resultado, erro, carregando). */
export function userSearchMessageRender(message: string, variant: MessageVariant = "info"): void {
  const container = getResultsContainer();
  if (!container) return;

  const alertElement = document.createElement("div");
  alertElement.classList.add("alert", `alert-${variant}`, "mb-0");
  alertElement.innerText = message;

  container.replaceChildren(alertElement);
}

/** Limpa a área de resultados. */
export function userSearchResultsClear(): void {
  getResultsContainer()?.replaceChildren();
}

function formatLocation(user: User): string {
  const parts = [user.city, user.state].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return "Local não informado";

  return parts.join("/");
}

function userResultRender(user: User, onChoose: (user: User) => void): HTMLLIElement {
  const liElement = document.createElement("li");
  liElement.classList.add("list-group-item", "d-flex", "justify-content-between", "align-items-center", "gap-3");

  const infoElement = document.createElement("div");
  infoElement.classList.add("text-start");

  const nameElement = document.createElement("div");
  nameElement.classList.add("fw-semibold");
  nameElement.innerText = user.name;

  const emailElement = document.createElement("div");
  emailElement.classList.add("small", "text-muted");
  emailElement.innerText = user.email;

  const detailsElement = document.createElement("div");
  detailsElement.classList.add("small");
  detailsElement.innerText = `${user.job_title ?? "Cargo não informado"} · ${formatLocation(user)}`;

  infoElement.append(nameElement, emailElement, detailsElement);

  const chooseButton = document.createElement("button");
  chooseButton.type = "button";
  chooseButton.classList.add("btn", "btn-outline-primary", "btn-sm");
  chooseButton.innerText = "Escolher";
  chooseButton.addEventListener("click", () => onChoose(user));

  liElement.append(infoElement, chooseButton);

  return liElement;
}

/** Lista os usuários encontrados, com o total e um botão "Escolher" em cada um. */
export default function userSearchResultsRender(
  result: PaginatedResponse<User>,
  onChoose: (user: User) => void
): void {
  const container = getResultsContainer();
  if (!container) return;

  if (result.data.length === 0) {
    userSearchMessageRender("Nenhum usuário encontrado para essa busca.", "warning");
    return;
  }

  const totalElement = document.createElement("p");
  totalElement.classList.add("small", "text-muted", "mb-2");

  const plural = result.total === 1 ? "" : "s";
  let totalText = `${result.total} usuário${plural} encontrado${plural}`;
  if (result.total > result.data.length) {
    totalText += ` (mostrando os ${result.data.length} primeiros)`;
  }
  totalElement.innerText = totalText;

  const ulElement = document.createElement("ul");
  ulElement.classList.add("list-group");

  result.data.forEach((user) => {
    ulElement.append(userResultRender(user, onChoose));
  });

  container.replaceChildren(totalElement, ulElement);
}
