<script setup lang="ts">
import type { WishlistItem } from '~/types/pokemon'
import { MAX_NICKNAME, nicknameOf } from '~/utils/wishlist'

const props = defineProps<{ item: WishlistItem }>()
const emit = defineEmits<{
  rename: [nickname: string]
  remove: []
  like: []
}>()
const { t } = useI18n()

const editing = ref(false)
const draft = ref('')
const input = ref<HTMLInputElement>()

async function startEdit(): Promise<void> {
  draft.value = nicknameOf(props.item)
  editing.value = true
  await nextTick()
  input.value?.focus()
  input.value?.select()
}

function save(): void {
  if (!editing.value) return
  editing.value = false
  emit('rename', draft.value)
}

function cancel(): void {
  editing.value = false
}
</script>

<template>
  <PokemonCard :pokemon="item">
    <template #name>
      <div class="flex min-h-[2lh] w-full flex-col items-center gap-1">
        <form v-if="editing" class="w-full" @submit.prevent="save">
          <input
            ref="input"
            v-model="draft"
            type="text"
            class="pixel-input pixel-input--sm"
            :maxlength="MAX_NICKNAME"
            :aria-label="t('card.nicknameOf', { name: displayName(item.name) })"
            autocomplete="off"
            spellcheck="false"
            @blur="save"
            @keydown.esc="cancel"
          />
        </form>
        <h3
          v-else
          class="text-center text-[9px] uppercase [overflow-wrap:anywhere]"
        >
          {{ nicknameOf(item) }}
        </h3>
        <p
          class="text-center text-[7px] text-muted uppercase [overflow-wrap:anywhere]"
        >
          {{ displayName(item.name) }}
        </p>
      </div>
    </template>

    <button
      type="button"
      class="pixel-btn pixel-btn--ghost w-[calc(100%-8px)]"
      @mousedown.prevent
      @click="editing ? save() : startEdit()"
    >
      {{ editing ? t('card.ok') : t('card.rename') }}
    </button>
    <button
      type="button"
      class="pixel-btn pixel-btn--ghost w-[calc(100%-8px)]"
      :aria-label="
        t('card.like', { name: nicknameOf(item), count: item.likes ?? 0 })
      "
      @click="emit('like')"
    >
      <span class="text-red" aria-hidden="true">♥</span> {{ item.likes ?? 0 }}
    </button>
    <button
      type="button"
      class="pixel-btn pixel-btn--blue w-[calc(100%-8px)]"
      @click="emit('remove')"
    >
      {{ t('card.remove') }}
    </button>
  </PokemonCard>
</template>
