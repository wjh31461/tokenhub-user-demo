<script setup lang="ts">
import { computed, ref } from 'vue'
const props = defineProps<{ days: { date: string; input: number; output: number }[]; partial: boolean }>()
const hovered = ref<number | null>(null)
const max = computed(() => Math.ceil(Math.max(...props.days.map(d => d.input + d.output), 1) / 100000) * 100000)
const selected = computed(() => hovered.value === null ? null : props.days[hovered.value])
const height = (n: number) => n / max.value * 154
const width = computed(() => 840 / props.days.length)
const fmt = (n: number) => n.toLocaleString('zh-CN')
</script>
<template>
  <div class="trend-wrap">
    <div class="trend-tooltip" aria-live="polite" :class="{ visible: selected }"><template v-if="selected"><strong>{{ selected.date }}{{ partial && hovered === days.length - 1 ? ' · 更新中' : '' }}</strong><span>输入 {{ fmt(selected.input) }}　输出 {{ fmt(selected.output) }}　合计 {{ fmt(selected.input + selected.output) }} Token</span></template><template v-else>悬浮或聚焦柱状图查看每日用量</template></div>
    <svg class="trend-svg" viewBox="0 0 930 218" role="group" aria-label="每日输入与输出 Token 堆叠柱状图">
      <g v-for="tick in [0, 1, 2, 3, 4]" :key="tick"><line x1="61" x2="913" :y1="177-tick*38.5" :y2="177-tick*38.5" stroke="#edf1f7" :stroke-dasharray="tick ? '4 4' : undefined" /><text x="49" :y="181-tick*38.5" text-anchor="end" fill="#9aa6b8" font-size="12">{{ (max*tick/4/10000).toFixed(0) }}万</text></g>
      <g v-for="(day, index) in days" :key="day.date" tabindex="0" role="img" :aria-label="`${day.date}，输入 ${fmt(day.input)}，输出 ${fmt(day.output)}，合计 ${fmt(day.input+day.output)} Token${partial && index === days.length-1 ? '，计量更新中' : ''}`" @mouseenter="hovered=index" @mouseleave="hovered=null" @focus="hovered=index" @blur="hovered=null">
        <rect :x="66+index*width" y="17" :width="width" height="163" fill="transparent" />
        <rect :x="66+index*width+width*.29" :y="177-height(day.input)" :width="width*.42" :height="height(day.input)" fill="#517be9" />
        <rect :x="66+index*width+width*.29" :y="177-height(day.input+day.output)" :width="width*.42" :height="height(day.output)" rx="2" fill="#b7cbfa" />
        <circle v-if="partial && index === days.length-1" :cx="66+index*width+width*.5" :cy="167-height(day.input+day.output)" r="3" fill="#eaa541" />
        <text v-if="days.length===7 || index%5===0 || index===days.length-1" :x="66+index*width+width*.5" y="202" text-anchor="middle" fill="#9aa6b8" font-size="12">{{ day.date.slice(5).replace('-', '/') }}</text>
      </g>
    </svg>
  </div>
</template>
<style scoped>
.trend-wrap{position:relative}.trend-tooltip{min-height:30px;display:flex;align-items:center;gap:14px;color:#a0acbd;font-size:13px;padding:0 9px;flex-wrap:wrap}.trend-tooltip.visible{color:#64738b}.trend-tooltip strong{font-weight:550;color:#344a70}.trend-svg{display:block;width:100%;height:auto;min-height:165px}.trend-svg g:focus{outline:none}.trend-svg g:focus rect[fill="transparent"]{fill:#edf2ff88}@media(max-width:640px){.trend-tooltip{font-size:12px;gap:3px}.trend-svg{min-height:130px}}
</style>
