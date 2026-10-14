import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from "vue";
import { SpacetimeGrid as SpacetimeGridCore } from "../SpacetimeGrid";
import type { SpacetimeGridSettings } from "../options";
import type { GridPlugin, SpacetimeGridTheme } from "../types";
import { SETTING_KEYS, liveOptions, liveSignature, pickOptions, structuralSignature } from "../wrapper-utils";

type SettingProps = {
  [K in keyof SpacetimeGridSettings]: { type: PropType<SpacetimeGridSettings[K]>; default: undefined };
};

const settingProps = Object.fromEntries(
  SETTING_KEYS.map((key) => [key, { type: null, default: undefined }]),
) as unknown as SettingProps;

export const SpacetimeGrid = defineComponent({
  name: "SpacetimeGrid",
  props: {
    ...settingProps,
    theme: { type: Object as PropType<Partial<SpacetimeGridTheme>>, default: undefined },
    plugins: { type: Array as PropType<readonly GridPlugin[]>, default: undefined },
  },
  emits: {
    ready: (grid: SpacetimeGridCore) => grid instanceof SpacetimeGridCore,
  },
  setup(props, { emit, expose }) {
    const container = ref<HTMLDivElement | null>(null);
    const grid = shallowRef<SpacetimeGridCore | null>(null);
    let removePlugins: (() => void)[] = [];

    function applyPlugins(): void {
      removePlugins.forEach((remove) => remove());
      removePlugins = [];
      const instance = grid.value;
      if (!instance || !props.plugins) return;
      removePlugins = props.plugins.map((plugin) => instance.use(plugin));
    }

    function create(): void {
      destroy();
      if (!container.value) return;
      const instance = new SpacetimeGridCore(container.value, pickOptions(props));
      grid.value = instance;
      applyPlugins();
      emit("ready", instance);
    }

    function destroy(): void {
      removePlugins.forEach((remove) => remove());
      removePlugins = [];
      grid.value?.destroy();
      grid.value = null;
    }

    onMounted(create);
    onBeforeUnmount(destroy);
    watch(() => structuralSignature(props), create);
    watch(() => liveSignature(props), () => grid.value?.setOptions(liveOptions(props)));
    watch(() => props.plugins, applyPlugins);

    expose({ grid });

    return () => h("div", { ref: container, class: "spacetime-grid", style: { width: "100%", height: "100%" } });
  },
});

export default SpacetimeGrid;
