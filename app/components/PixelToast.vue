<script setup lang="ts">
const { message } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    aria-live="polite"
  >
    <p
      v-if="message"
      :key="message"
      class="dialog dialog--cursor w-full max-w-md text-[10px] uppercase"
    >
      {{ message }}
    </p>
  </div>
</template>
