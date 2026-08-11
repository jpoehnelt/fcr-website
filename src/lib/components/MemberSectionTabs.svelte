<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import KeyRoundIcon from "@lucide/svelte/icons/key-round";
  import MegaphoneIcon from "@lucide/svelte/icons/megaphone";
  import type { Snippet } from "svelte";

  type MemberSection = "announcements" | "gate";

  interface Props {
    active: MemberSection;
    children: Snippet;
  }

  const { active, children }: Props = $props();

  function selectSection(section: string): void {
    if (section === active) return;
    const destination = section === "gate" ? "/members/gate/" : "/members/";
    void goto(destination, { keepFocus: true, noScroll: true });
  }
</script>

<Tabs.Root value={active} onValueChange={selectSection} class="mt-6 gap-2">
  <Tabs.List class="h-10" aria-label="Member dashboard sections">
    <Tabs.Trigger value="announcements">
      <MegaphoneIcon data-icon="inline-start" aria-hidden="true" />
      Announcements
    </Tabs.Trigger>
    <Tabs.Trigger value="gate">
      <KeyRoundIcon data-icon="inline-start" aria-hidden="true" />
      Gate access
    </Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value={active} class="pt-3 text-base">
    {@render children()}
  </Tabs.Content>
</Tabs.Root>
