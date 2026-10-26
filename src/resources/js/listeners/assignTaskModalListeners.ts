import { userSearchApi } from "../api/userSearchApi";
import { taskCreateApi } from "../api/taskCreateApi";
import tasksListRender from "../render/tasksListRender";
import userSearchResultsRender, {
  userSearchMessageRender,
  userSearchResultsClear,
} from "../render/userSearchResultsRender";
import { getApiErrorMessage } from "../utils/getApiErrorMessage";
import type { User, UserSearchFilters, UserSearchTextField } from "../types/api";

const SEARCH_TEXT_FIELDS: readonly UserSearchTextField[] = ["name", "email", "job_title", "bio", "city", "state"];

function isSearchTextField(value: string): value is UserSearchTextField {
  return (SEARCH_TEXT_FIELDS as readonly string[]).includes(value);
}

/**
 * Modal "Nova tarefa para outro usuário": busca o usuário de destino
 * pela POST /users/search, permite escolher um resultado e cria a tarefa
 * para ele (POST /users/{idUser}/tasks).
 *
 * idUser é o usuário logado: se ele escolher a si mesmo, a lista é recarregada.
 */
export default function assignTaskModalListeners(idUser: number): void {
  const modalElement = document.querySelector<HTMLDivElement>("#assign-task-modal");
  const taskNameInput = document.querySelector<HTMLInputElement>("#assign-task-name");
  const searchFieldSelect = document.querySelector<HTMLSelectElement>("#assign-search-field");
  const searchValueInput = document.querySelector<HTMLInputElement>("#assign-search-value");
  const searchButton = document.querySelector<HTMLButtonElement>("#assign-search-btn");
  const selectedUserElement = document.querySelector<HTMLDivElement>("#assign-selected-user");
  const messageElement = document.querySelector<HTMLDivElement>("#assign-task-message");
  const submitButton = document.querySelector<HTMLButtonElement>("#assign-task-submit");
  const feedbackElement = document.querySelector<HTMLDivElement>("#assign-task-feedback");

  if (
    !modalElement ||
    !taskNameInput ||
    !searchFieldSelect ||
    !searchValueInput ||
    !searchButton ||
    !selectedUserElement ||
    !messageElement ||
    !submitButton
  ) {
    console.error("Modal de atribuição de tarefa não encontrado no HTML.");
    return;
  }

  let selectedUser: User | null = null;
  let isSubmitting = false;

  // ── Helpers de estado/tela ──────────────────────────────────

  const updateSubmitState = (): void => {
    const hasName = taskNameInput.value.trim() !== "";
    submitButton.disabled = isSubmitting || !hasName || selectedUser === null;
  };

  const showModalMessage = (message: string): void => {
    messageElement.innerText = message;
    messageElement.classList.remove("d-none");
  };

  const hideModalMessage = (): void => {
    messageElement.innerText = "";
    messageElement.classList.add("d-none");
  };

  const selectUser = (user: User): void => {
    selectedUser = user;
    selectedUserElement.innerText = `Atribuir para: ${user.name} (${user.email})`;
    selectedUserElement.classList.remove("d-none");
    hideModalMessage();
    updateSubmitState();
  };

  const resetModal = (): void => {
    selectedUser = null;
    taskNameInput.value = "";
    searchValueInput.value = "";
    searchFieldSelect.selectedIndex = 0;
    selectedUserElement.innerText = "";
    selectedUserElement.classList.add("d-none");
    userSearchResultsClear();
    hideModalMessage();
    updateSubmitState();
  };

  const closeModal = (): void => {
    // Usa o próprio data-bs-dismiss do Bootstrap para fechar o modal
    modalElement.querySelector<HTMLButtonElement>('[data-bs-dismiss="modal"]')?.click();
  };

  const showFeedback = (message: string): void => {
    if (!feedbackElement) return;

    feedbackElement.innerText = message;
    feedbackElement.classList.remove("d-none");
  };

  // ── Busca ──────────────────────────────────────────────────

  const handleSearch = async (): Promise<void> => {
    const field = searchFieldSelect.value;
    const value = searchValueInput.value.trim();

    if (!isSearchTextField(field)) {
      userSearchMessageRender("Campo de busca inválido.", "danger");
      return;
    }

    if (value === "") {
      userSearchMessageRender("Digite um texto para buscar.", "warning");
      searchValueInput.focus();
      return;
    }

    // Ex.: cidade + "curitiba" → { city: "curitiba" }
    const filters: UserSearchFilters = {};
    filters[field] = value;

    searchButton.disabled = true;
    userSearchMessageRender("Buscando...", "secondary");

    try {
      const result = await userSearchApi(filters, 1, 10);
      userSearchResultsRender(result, selectUser);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      userSearchMessageRender(getApiErrorMessage(error, "Erro ao buscar usuários. Tente novamente."), "danger");
    } finally {
      searchButton.disabled = false;
    }
  };

  // ── Criar tarefa ───────────────────────────────────────────

  const handleSubmit = async (): Promise<void> => {
    const taskName = taskNameInput.value.trim();

    if (taskName === "") {
      showModalMessage("Digite o nome da tarefa.");
      taskNameInput.focus();
      return;
    }

    if (selectedUser === null) {
      showModalMessage("Busque e escolha um usuário para atribuir a tarefa.");
      return;
    }

    const targetUser = selectedUser;

    isSubmitting = true;
    updateSubmitState();
    hideModalMessage();

    try {
      await taskCreateApi(targetUser.id, { name: taskName });
    } catch (error) {
      console.error("Erro ao criar tarefa para outro usuário:", error);
      showModalMessage(getApiErrorMessage(error, "Erro ao criar a tarefa. Tente novamente."));
      return;
    } finally {
      isSubmitting = false;
      updateSubmitState();
    }

    resetModal();
    closeModal();
    showFeedback(`Tarefa "${taskName}" criada para ${targetUser.name}.`);

    if (targetUser.id !== idUser) return;

    try {
      await tasksListRender(idUser);
    } catch (error) {
      console.error("Erro ao recarregar a lista de tarefas:", error);
      showFeedback(`Tarefa "${taskName}" criada, mas não foi possível recarregar a lista.`);
    }
  };

  // ── Eventos ────────────────────────────────────────────────

  taskNameInput.addEventListener("input", updateSubmitState);

  searchButton.addEventListener("click", handleSearch);

  searchValueInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    void handleSearch();
  });

  submitButton.addEventListener("click", handleSubmit);

  // Ao abrir: esconde o aviso de sucesso anterior. Ao fechar (inclusive Cancelar): limpa tudo.
  modalElement.addEventListener("show.bs.modal", () => {
    feedbackElement?.classList.add("d-none");
  });

  modalElement.addEventListener("shown.bs.modal", () => {
    taskNameInput.focus();
  });

  modalElement.addEventListener("hidden.bs.modal", resetModal);

  updateSubmitState();
}
