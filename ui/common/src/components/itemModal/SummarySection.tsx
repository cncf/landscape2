import { For, Show } from 'solid-js';

import type { Item } from '../../types/datasets';
import { formatSummaryField } from '../../utils/formatSummaryField';
import { Badge } from '../Badge';
import { CollapsableText } from '../CollapsableText';
import { Section } from './Section';
import { type SectionVariant, Summary, SummaryBadge, SummaryContent, TitleInSection } from './styles';

interface Props {
  item: Item;
  variant: SectionVariant;
}

interface TextBlockProps {
  text: string;
  title: string;
  variant: SectionVariant;
}

interface BadgesBlockProps {
  title: string;
  values: string[];
  variant: SectionVariant;
}

/**
 * Summary of the item. The text blocks collapse on desktop and show in full on mobile; the introduction
 * is always shown in full.
 */
export const SummarySection = (props: Props) => {
  const summary = () => props.item.summary;
  const integrations = () => summary()?.integrations || summary()?.integration;
  const personas = () => summary()?.personas?.filter((persona) => persona !== '') ?? [];
  const tags = () => summary()?.tags?.filter((tag) => tag !== '') ?? [];
  const introClass = () => `mt-2 ${props.variant === 'mobile' ? 'text-truncate' : ''} ${SummaryContent[props.variant]}`;

  return (
    <Show when={summary()}>
      {(itemSummary) => (
        <Section title="Summary" variant={props.variant}>
          <div class={`my-2 ${Summary}`}>
            <Show when={itemSummary().intro_url}>
              {(introUrl) => (
                <div class="summaryBlock">
                  <div class={`fw-bold text-uppercase ${TitleInSection[props.variant]}`}>Introduction</div>
                  {/* eslint-disable-next-line solid/no-innerhtml -- formatSummaryField escapes the text */}
                  <div class={introClass()} innerHTML={formatSummaryField(introUrl())} />
                </div>
              )}
            </Show>
            <Show when={itemSummary().use_case}>
              {(text) => <TextBlock title="Use case" text={text()} variant={props.variant} />}
            </Show>
            <Show when={itemSummary().business_use_case}>
              {(text) => <TextBlock title="Business use case" text={text()} variant={props.variant} />}
            </Show>
            <Show when={integrations()}>
              {(text) => <TextBlock title="Integrations" text={text()} variant={props.variant} />}
            </Show>
            <Show when={itemSummary().release_rate}>
              {(text) => <TextBlock title="Release rate" text={text()} variant={props.variant} />}
            </Show>
            <BadgesBlock title="Personas" values={personas()} variant={props.variant} />
            <BadgesBlock title="Tags" values={tags()} variant={props.variant} />
          </div>
        </Section>
      )}
    </Show>
  );
};

/** Summary block listing values as badges; nothing renders without values. */
const BadgesBlock = (props: BadgesBlockProps) => (
  <Show when={props.values.length > 0}>
    <div class="summaryBlock">
      <div class={`fw-bold text-uppercase ${TitleInSection[props.variant]}`}>{props.title}</div>
      <For each={props.values}>{(value) => <Badge text={value} class={`me-2 mt-2 ${SummaryBadge}`} />}</For>
    </div>
  </Show>
);

/** Summary text block: collapsable on desktop, in full on mobile. */
const TextBlock = (props: TextBlockProps) => (
  <div class="summaryBlock">
    <div class={`fw-bold text-uppercase ${TitleInSection[props.variant]}`}>{props.title}</div>
    <div class={`mt-2 ${SummaryContent[props.variant]}`}>
      <Show when={props.variant === 'mobile'} fallback={<CollapsableText text={props.text} />}>
        {/* eslint-disable-next-line solid/no-innerhtml -- formatSummaryField escapes the text */}
        <div innerHTML={formatSummaryField(props.text)} />
      </Show>
    </div>
  </div>
);
