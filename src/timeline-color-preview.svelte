<script lang="ts">
    import { createTimelineRenderColors } from "./timeline-colors";
    import type { TimelineColorSettings } from "./settings";

    export let schemes: TimelineColorSettings;

    const schemeEntries = [
        { key: "light" as const, label: "Light mode" },
        { key: "dark" as const, label: "Dark mode" },
    ];
    const previewItems = [
        { time: "10:00", text: "Example task" },
        { time: "11:00", text: "Example task" },
        { time: "12:00", text: "Example task" },
        { time: "13:00", text: "Example task" },
    ];

    $: renderSchemes = {
        light: createTimelineRenderColors(schemes.light, 4),
        dark: createTimelineRenderColors(schemes.dark, 4),
    };

    function styleFor(
        scheme: ReturnType<typeof createTimelineRenderColors>,
    ): string {
        return [
            `--aside-line: color-mix(in srgb, ${scheme.lineColor} 40%, transparent)`,
            `--aside-dot: color-mix(in srgb, ${scheme.lineColor} 60%, transparent)`,
            `--active-dot: ${scheme.lineColor}`,
            `--timeline-text-color: ${scheme.textColor}`,
            `--now-line-color: ${scheme.nowLineColor}`,
            `--now-line-text-color: ${scheme.nowLineTextColor}`,
        ].join(";");
    }

    function eventStyle(
        scheme: ReturnType<typeof createTimelineRenderColors>,
        index: number,
    ): string {
        return `--event-color: ${scheme.colors[index]}; --event-hover: ${scheme.hoverColors[index]}`;
    }
</script>

<div class="day-planner-timeline-color-preview">
    {#each schemeEntries as entry}
        <section
            class="day-planner-timeline-color-preview__scheme"
            class:theme-light={entry.key === "light"}
            class:theme-dark={entry.key === "dark"}
            style={styleFor(renderSchemes[entry.key])}
        >
            <div class="day-planner-timeline-color-preview__heading">
                {entry.label}
            </div>
            <div class="day-planner-timeline-color-preview__track">
                <div class="aside">
                    <div class="aside__line"></div>
                </div>
                <div class="events">
                    {#each previewItems as item, index}
                        <div
                            class="event_item"
                            style={eventStyle(
                                renderSchemes[entry.key],
                                index,
                            )}
                        >
                            <div class="event_item_contents">
                                <div class="ei_Dot" class:dot_active={index === 1}></div>
                                <div class="ei_Item">
                                    <span class="ei_Title">{item.time}</span>
                                    <span class="ei_Copy">{item.text}</span>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
                <div class="now-line">
                    <span class="timeline-time">12:00</span>
                </div>
            </div>
        </section>
    {/each}
</div>
