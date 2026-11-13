import { CapabilitiesSection } from "@/components/capabilities/CapabilitiesSection";
import { CapabilityPage } from "@/components/capabilities/CapabilityPage";
import { IntroPage } from "@/components/capabilities/IntroPage";
import { PhonesPage } from "@/components/capabilities/PhonesPage";
import { ToolsPage } from "@/components/capabilities/ToolsPage";
import { capabilitiesConfig } from "@/components/capabilities/capabilities.config";
import { GallerySection } from "@/components/gallery/GallerySection";
import { IllustrationsSection } from "@/components/illustrations/IllustrationsSection";
import { MerchSection } from "@/components/merch/MerchSection";
import { TearHero } from "@/components/tear/TearHero";

export default function Home() {
  return (
    <main>
      <TearHero />
      {/* Pinned story: Visual design → merch → illustrations → gallery → AI in design → Agentic commerce → phones (spread) → AI design tools. */}
      <CapabilitiesSection
        steps={[
          { node: <MerchSection embedded /> },
          { node: <IllustrationsSection embedded /> },
          { node: <GallerySection embedded /> },
          {
            node: <CapabilityPage page={capabilitiesConfig.ai} />,
            enter: "up",
            tab: 1,
          },
          {
            node: <IntroPage {...capabilitiesConfig.agentic} />,
            center: true,
          },
          {
            node: <PhonesPage {...capabilitiesConfig.agentic} />,
            enter: "lift",
            spread: true,
          },
          { node: <ToolsPage /> },
        ]}
      />
    </main>
  );
}
