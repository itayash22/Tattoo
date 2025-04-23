export function attachPromptButtons(suggestionsContainer, promptTextarea) {
  suggestionsContainer.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      promptTextarea.value += btn.dataset.token;
    });
  });
}
