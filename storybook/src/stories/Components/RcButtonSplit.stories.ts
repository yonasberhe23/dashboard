import type { Meta, StoryObj } from '@storybook/vue3';
import { RcButtonSplit } from '@components/RcButtonSplit';
import { RcDropdownItem, RcDropdownSeparator } from '@components/RcDropdown';
import RcIcon from '@components/RcIcon/RcIcon.vue';
import { ButtonVariant, ButtonSize } from '@components/RcButton/types';

const meta: Meta<typeof RcButtonSplit> = {
  component: RcButtonSplit,
  argTypes:  {
    variant: {
      options:     ['primary', 'secondary', 'tertiary', 'link', 'ghost'] as ButtonVariant[],
      control:     { type: 'select' },
      description: 'Visual style applied to both the action button and the dropdown trigger.',
    },
    size: {
      options:     ['small', 'medium', 'large'] as ButtonSize[],
      control:     { type: 'select' },
      description: 'Size applied to both the action button and the dropdown trigger.',
    },
    ariaLabel: {
      control:     { type: 'text' },
      description: 'Accessible label forwarded to the dropdown menu.',
    },
    placement: {
      options:     ['bottom-end', 'bottom-start', 'top-end', 'top-start'],
      control:     { type: 'select' },
      description: 'Placement of the dropdown menu relative to the trigger.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RcButtonSplit>;

export const Default: Story = {
  render: (args: any) => ({
    components: {
      RcButtonSplit,
      RcDropdownItem,
      RcDropdownSeparator,
    },
    setup() {
      const onClick = () => console.log('Primary action clicked'); // eslint-disable-line no-console

      return { args, onClick };
    },
    template: `
      <RcButtonSplit v-bind="args" @click="onClick">
        Save
        <template #dropdownCollection>
          <RcDropdownItem @click="() => console.log('Save as Draft')">Save as Draft</RcDropdownItem>
          <RcDropdownItem @click="() => console.log('Save as Template')">Save as Template</RcDropdownItem>
          <RcDropdownSeparator />
          <RcDropdownItem @click="() => console.log('Discard')">Discard Changes</RcDropdownItem>
        </template>
      </RcButtonSplit>
    `,
  }),
  args: {
    variant: 'primary',
    size:    'medium',
  },
};

export const AllVariants: Story = {
  render: (args: any) => ({
    components: {
      RcButtonSplit,
      RcDropdownItem,
    },
    setup() {
      const variants: ButtonVariant[] = ['primary', 'secondary', 'tertiary', 'link', 'ghost'];

      return { args, variants };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 800px;">
        <div v-for="variant in variants" :key="variant" style="display: flex; align-items: center; gap: 20px;">
          <div style="min-width: 120px; font-weight: bold;">{{ variant }}</div>
          <RcButtonSplit :variant="variant" size="medium">
            {{ variant }}
            <template #dropdownCollection>
              <RcDropdownItem>Option 1</RcDropdownItem>
              <RcDropdownItem>Option 2</RcDropdownItem>
            </template>
          </RcButtonSplit>
        </div>
      </div>
    `,
  }),
  parameters: {
    controls: { disabled: true },
    docs:     { canvas: { sourceState: 'none' } },
  },
};

export const AllSizes: Story = {
  render: (args: any) => ({
    components: {
      RcButtonSplit,
      RcDropdownItem,
    },
    setup() {
      const sizes: ButtonSize[] = ['small', 'medium', 'large'];

      return { args, sizes };
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 800px;">
        <div v-for="size in sizes" :key="size" style="display: flex; align-items: center; gap: 20px;">
          <div style="min-width: 120px; font-weight: bold;">{{ size }}</div>
          <RcButtonSplit variant="primary" :size="size">
            {{ size }}
            <template #dropdownCollection>
              <RcDropdownItem>Option 1</RcDropdownItem>
              <RcDropdownItem>Option 2</RcDropdownItem>
            </template>
          </RcButtonSplit>
        </div>
      </div>
    `,
  }),
  parameters: {
    controls: { disabled: true },
    docs:     { canvas: { sourceState: 'none' } },
  },
};

export const WithSlots: Story = {
  render: (args: any) => ({
    components: {
      RcButtonSplit,
      RcDropdownItem,
      RcIcon,
    },
    setup() {
      return { args };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center;">
        <RcButtonSplit variant="primary" size="medium">
          <template #before>
            <RcIcon type="plus" size="inherit" />
          </template>
          Create
          <template #dropdownCollection>
            <RcDropdownItem>Create from Template</RcDropdownItem>
            <RcDropdownItem>Import</RcDropdownItem>
          </template>
        </RcButtonSplit>

        <RcButtonSplit variant="secondary" size="medium">
          <template #before>
            <RcIcon type="download" size="inherit" />
          </template>
          Download
          <template #after>
            <span style="font-size: 10px; opacity: 0.7;">v2</span>
          </template>
          <template #dropdownCollection>
            <RcDropdownItem>Download v1</RcDropdownItem>
            <RcDropdownItem>Download v2</RcDropdownItem>
          </template>
        </RcButtonSplit>
      </div>
    `,
  }),
  parameters: {
    controls: { disabled: true },
    docs:     { canvas: { sourceState: 'none' } },
  },
};
