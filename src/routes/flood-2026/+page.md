---
title: "November 2026 Flood: Satellite Analysis"
description: "Satellite before-and-after analysis of the November 1-2, 2026 flood at Falls Creek Ranch: where the ground changed, and how to read the map."
---

<script>
  import FileHistory from '$lib/components/FileHistory.svelte';
</script>

On November 1-2, 2026, flooding and debris flows blocked ranch roads, filled culverts, and carried a heavy load of sediment into Turner Lake. This page shows what satellites saw: a comparison of the ranch before the storm (October 27) and after it (November 3), drawn on a topographic map so residents can match the changes to places they know.

## The map

![Satellite change map of the north end of Falls Creek Ranch on a USGS topographic base. Red marks newly bare soil, green marks water and sediment changes including Turner Lake, and blue marks radar-detected surface change.](/uploads/documents/flood-2026/topo-change-map-north.png)

The north end of the ranch: Falls Creek valley, Turner Lake, and the Animas River floodplain at the right edge. Coordinates along the edges are latitude and longitude, about 1.1 km (0.7 miles) apart, and positions read from this map are good to roughly 50 metres.

## How to read it

The background is a standard topographic map: brown lines are elevation contours (close together means steep), blue lines are creeks, and the faint green squares are land-survey sections. Colour on top of it marks where the ground changed between the two satellite passes.

- **Red: bare dirt appeared.** Vegetation was there before; now it is exposed soil. Debris piles, washed-out road edges, and mud deposits all read as red.
- **Green: water changed.** Either new water where there was none (flooding), or existing water turned muddy. The solid green shape at Turner Lake is the second kind: the lake filled with sediment, which is what turns it green on this map.
- **Blue: radar saw the surface change.** A second satellite using radar (October 25 to November 6) measures roughness and wetness rather than colour. Scattered blue speckle on steep hillsides is mostly a known radar effect on wet, steep ground. Blue alone is the weakest evidence on the map.

Where colours overlap, trust the result more. One satellite can be fooled; two agreeing at the same spot is much harder to explain away. Mixed colours - yellow, magenta, white - mean two or three different measurements changed at the same place.

## What the satellites found

- **The largest change is off the ranch.** The Animas River floodplain east of the ranch (the bright mixed colours at the right edge of the map) flooded and took fresh sediment across about 250 acres.
- **Turner Lake took a heavy sediment load.** The water's reflectivity rose sharply as muddy inflow arrived, and the lake surface reads as changed across its full area.
- **Debris reached the valley floor at the mouth of Dyke Canyon,** covering about 9 acres where the canyon meets Falls Creek - the largest single deposit on the ranch.
- **The north end of Falls Creek Main shows change** around the Oakcrest Drive area and the North Main culvert, matching where debris blocked the road.
- **No large hillside failure was found anywhere in the analysis area.** Every large change sits on flat ground or in a channel.

## What this map cannot show

The slides residents have seen on the ranch are narrow - a few metres wide on steep faces. Each square of satellite data is 10 metres across, so a narrow slide disappears into a single square. The radar satellite also cannot see west-facing slopes well, because it looks at the ground from an angle and those faces sit in its shadow.

So: no colour on a hillside does not mean no slide there. This analysis is reliable for flooding, valley-floor debris, and the lake. It can only say that no hillside failure was large enough for a satellite to see. Narrow slides still have to be found and measured from the ground or by drone.

## Wider view

![Satellite change map of the full ranch and the Animas River floodplain, without the topographic base. Red marks newly bare soil, green marks water and sediment changes, and blue marks radar-detected surface change.](/uploads/documents/flood-2026/combined-change-overview.png)

The full analysis area, from the south gate to north of the ranch boundary. The Animas floodplain dominates the east side; the ranch valley runs up the centre.

## Method, briefly

Optical imagery from Sentinel-2 (European Space Agency), October 27 and November 3, 2026, both passes essentially cloud-free over the ranch. Radar imagery from Sentinel-1, October 25 and November 6. Elevation and drainage from the 2018 USGS lidar survey of the ranch. Change was measured three ways - vegetation loss, bare-soil increase, and water change - and cross-checked between the optical and radar satellites. Topographic base from the USGS National Map.

<FileHistory file="src/routes/flood-2026/+page.md" />
