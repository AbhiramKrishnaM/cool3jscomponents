import { defineComponent, h, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from "vue";
import type { SpacetimeGridOptions, SpacetimeGridTheme } from "@abhiramkrishna/spacetime-grid";
import { contributionCalendarHTML } from "../calendar";
import type { ContributionData } from "../data";
import type { SkylineSettings, StandaloneSettings } from "../options";
import { ContributionSkyline as SkylineCore } from "../Skyline";
import { SKYLINE_KEYS, liveSkylineOptions, liveSkylineSignature, pickSkylineOptions, progressValue } from "../wrapper-utils";

type SettingProps = {
  [K in Exclude<keyof (SkylineSettings & StandaloneSettings), "progress">]: { type: PropType<(SkylineSettings & StandaloneSettings)[K]>; default: undefined };
};

const settingProps = Object.fromEntries(
  SKYLINE_KEYS.map((key) => [key, { type: null, default: undefined }]),
) as unknown as SettingProps;

export const ContributionSkyline = defineComponent({
  name: "ContributionSkyline",
  props: {
    ...settingProps,
    data: { type: Object as PropType<ContributionData>, required: true },
    progress: { type: [Number, Function] as PropType<number | (() => number)>, default: undefined },
    theme: { type: Object as PropType<Partial<SpacetimeGridTheme>>, default: undefined },
    grid: { type: Object as PropType<SpacetimeGridOptions>, default: undefined },
  },
  emits: {
    ready: (skyline: SkylineCore) => skyline instanceof SkylineCore,
  },
  setup(props, { emit, expose }) {
    const container = ref<HTMLDivElement | null>(null);
    const skyline = shallowRef<SkylineCore | null>(null);

    function create(): void {
      destroy();
      if (!container.value) return;
      const instance = new SkylineCore(container.value, props.data, {
        ...pickSkylineOptions(props),
        progress: progressValue(props.progress),
        grid: props.grid,
      });
      skyline.value = instance;
      emit("ready", instance);
    }

    function destroy(): void {
      skyline.value?.destroy();
      skyline.value = null;
    }

    onMounted(create);
    onBeforeUnmount(destroy);
    watch(() => JSON.stringify(props.grid ?? null), create);
    watch(() => props.data, (data) => skyline.value?.setData(data));
    watch(() => props.progress, (progress) => skyline.value?.setProgress(progressValue(progress)));
    watch(() => liveSkylineSignature(props), () => skyline.value?.setOptions(liveSkylineOptions(props)));

    expose({ skyline });

    return () => h("div", { ref: container, class: "contribution-skyline", style: { width: "100%", height: "100%" } });
  },
});

export const ContributionCalendar = defineComponent({
  name: "ContributionCalendar",
  props: {
    data: { type: Object as PropType<ContributionData>, required: true },
    caption: { type: Boolean, default: true },
    link: { type: Boolean, default: true },
    locale: { type: String, default: undefined },
  },
  setup(props) {
    return () => h("div", {
      innerHTML: contributionCalendarHTML(props.data, { caption: props.caption, link: props.link, locale: props.locale }),
    });
  },
});
