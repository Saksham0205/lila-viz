# LILA Player Journey — Insights

Run the visualization on the February 10–14 dataset (select those dates in the filter panel once `player_data` is wired in), overlay heatmaps, scrub matches, then capture takeaways below. Replace or refine anything here with what you actually see on your minimaps.

---

## Insight 1 — Open ground vs compounds on AmbroseValley

**Map:** AmbroseValley  
**Date range:** February 10–14  
**Heatmap type:** Kill Zones

**Observation:**  
Kill heat often reads as **two rhythms**: tighter red pockets on **compound-style clusters** (hard cover, doorway fights) and a **scatter** of engagements on the long grassy / valley floor where sightlines stay open longer. Paths that cut straight across wide expositions tend to accumulate more intersecting fights than riders who peel along hedgerows or ridges.

**Hypothesis:**  
Players trade in the open until someone claims a compound; the valley’s length rewards **hold angles** from structures more than mid-field duels unless the circle forces a crossing. Loot or circle pull that drags rotations through the basin would spike mid-map traffic and deaths there.

**Design Recommendation:**  
Prototype **one or two micro-cover bands** (rock lines, ruined walls, ditches) on the widest crossing lines so mid-rotations are not binary “full sprint or full stop at building.” Audit **compound door counts** on the hottest tiles—if one entrance dominates, consider a broken wall or interior route to split peek wars.

---

## Insight 2 — Vertical pressure and cuts on GrandRift

**Map:** GrandRift  
**Date range:** February 10–14  
**Heatmap type:** Player Traffic

**Observation:**  
Traffic heat shows **funneling along the rift edges** and **pinch points** where the playable strip narrows. Early paths look exploratory; late-match traces stack on the same **2–3 crossing bridges or shelf drops**, which is where kill/death overlays often intensify if you turn them on for the same window.

**Hypothesis:**  
The map’s **vertical drop** makes “safe” rotations predictable—players hug the same shelf geometry. Any POI that sits on a mandatory bend becomes a **server-wide choke** for that circle seed.

**Design Recommendation:**  
Add **one alternate shelf route** (scramble, zipline, or wider ledge) between the two busiest pinch metrics you see, or **widen** the narrowest bridge by a few meters so fights can side-step. If a POI is doing double duty as only cover *and* only rotation, **split loot or cover** so one role moves 50–80 m off the choke.

---

## Insight 3 — Storm timing and interior dead-ends on Lockdown

**Map:** Lockdown  
**Date range:** February 10–14  
**Heatmap type:** Storm Deaths

**Observation:**  
Storm-death blobs cluster on **late circles** and often hug **map edges** or **long interior corridors** where the safe zone steps faster than players can clear. When you pair this with the movement paths for the same dates, many victims are on **straight-line stalls** rather than looping exterior doors.

**Hypothesis:**  
Indoor readability + **few clear exits per wing** cause players to gamble on shortcuts. Storm phases that shave the **only exterior door** amplify losses more than raw damage tuning would suggest.

**Design Recommendation:**  
Mark the **top three storm-hot corridors** from the heatmap and add **explicit “way out” reads** (color, signage, breakable, or a second breach) on at least one per wing. If storm circles repeatedly delete the same wing, consider **slightly earlier phase shift** or **wider final ring slice** for that seed—document which change you try so the next week’s Parquet can confirm.

---

### How to refresh this doc

1. Backend + frontend running locally; `PLAYER_DATA_PATH` pointing at data that includes Feb 10–14.  
2. For each map: set dates → toggle **Kill Zones / Death Zones / Storm Deaths / Player Traffic** one at a time → open several high-traffic matches and follow paths with events on.  
3. Paste screenshots or IDs in your issue tracker; keep this file as **short hypotheses + actions**, not a data dump.
