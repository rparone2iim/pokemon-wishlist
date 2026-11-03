let timer: ReturnType<typeof setTimeout> | undefined

// Petit message façon boîte de dialogue de jeu, en bas de l'écran.
export function useToast() {
  const message = useState<string | null>('toast', () => null)

  function show(text: string) {
    message.value = text
    clearTimeout(timer)
    timer = setTimeout(() => (message.value = null), 2600)
  }

  return { message, show }
}
