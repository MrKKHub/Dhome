import type { Component } from 'vue'
import {
  Bird,
  Cloud,
  Flower2,
  Leaf,
  Moon,
  Rabbit,
  Sparkles,
  Sun,
  TreePine,
  Wind,
} from 'lucide-vue-next'

/** 与后端 ForestIdentityService 图标键一致（小写 + kebab） */
const MAP: Record<string, Component> = {
  leaf: Leaf,
  cloud: Cloud,
  moon: Moon,
  bird: Bird,
  'tree-pine': TreePine,
  wind: Wind,
  sun: Sun,
  sparkles: Sparkles,
  'flower-2': Flower2,
  rabbit: Rabbit,
}

export function resolveForestLucideIcon(
  key: string | null | undefined,
): Component {
  if (!key || typeof key !== 'string') {
    return Leaf
  }
  return MAP[key.trim().toLowerCase()] ?? Leaf
}
