# Cello: Ashes of the Fallen

Ett 3D-äventyr i världen The Shattered Realm, flytande öar i en evig storm, byggt med [Three.js](https://threejs.org) och spelbart direkt i webbläsaren.

**Version:** prototyp 0.6 · en större värld (fas 0–5 klara, fas 6 påbörjad i utvecklingsplanen)

Spelet är på engelska. Kommentarerna i koden och den här filen är på svenska.

## Spela

Spelet behöver ingen installation, bara en enkel webbserver (webbläsare tillåter inte moduler från `file://`).

```bash
npm start            # startar en server på http://localhost:8080
```

Alternativt: aktivera **GitHub Pages** för repot (Settings → Pages → Deploy from branch → `main` / root), så går spelet att spela på `https://<användarnamn>.github.io/<repo>/`.

En fristående version (en enda HTML-fil med all kod) byggs med:

```bash
npm install          # en gång, hämtar esbuild
npm run build:artifact   # → build/play.html
```

## Vad är nytt i 0.6: en större värld

Världen är nu uppdelad i områden som laddas vid gränserna. När Cello går in i dimman vid en bro tonar skärmen till svart och nästa område tar vid. Fästningen syns inte längre från byn; resan dit är lång.

| Område | Vad som finns där |
| --- | --- |
| **Cellos hem** | Huset (går att gå in i, med säng och en kista), trädgården, getterna och övningsdockan |
| **Hollowbrook och Aetheria** | Den brinnande byn och lägret, som förut. Stenvägen norr om Aetheria leder nu vidare ut i världen |
| **Thistledown Ranch** | Bondgården: Hollis, Nell och Tilly, ladan, stallet, betesmark med getter och kor, åkern, dammen, en eld att vila vid |
| **Galewind Pass** | En ravin med vaktporten (Garrick), en klyfta med en kista, och **The Long Bridge**: 180 meter över stormen, med pilgrimen Odo vid rastplatsen |
| **The Stormvale** | Det stora fältet (450 meter tvärs över): vägar, korsvägen med Mags läger, ruiner, ett tempel, en stencirkel, en fallen jättestaty med kartritaren Wren, sjöar, skogsdungar, stormstenen och den gyllene porten |
| **Willowmere** | Den andra byn, vid en sjö: Pells butik, värdshuset Willow & Wick (vila och spara), spåkvinnan Ysolde, väktaren Doran, fiskaren Fenwick, barnen Mira och Tob, väderkvarnen och en anslagstavla |
| **Stormreach** | Ett kargt höglandet där stormen föds, med döda träd, svarta spiror och spejaren Fenns läger vid grottan |
| **The Hollow Cave** | En kolsvart grotta. Två eldfat måste tändas med lyktan för att stendörren ska sjunka |
| **The Tempest Bastion** | Fästningen, som förut, men nu längst bort i norr |

Det tar ungefär fyra minuter att springa raka vägen från Aetheria till fästningen, och mer om man stannar, slåss och letar kistor.

### Föremål, butik och pengar

- **Föremålsmenyn (Tab):** välj vilket föremål som ligger på **F**, **G** och **V**, som snabbknapparna i klassiska äventyrsspel. Menyn visar också svärdet, skölden, det Cello har fått och vad spåkvinnan sa.
- **Skärvor** är pengarna: gröna (1), blå (5), röda (20) och lila (50). De finns i gräset (svärdet klipper det), i krukor, hos fiender och i kistor.
- **Svärdet slits** när det träffar, och mest mot sköldar. Det går av till slut och skär då kortare och svagare. Pell säljer ett nytt, och Vane i Aetheria smider ett åt den som har skärvor.
- **Lyktan** (Pell, 40 skärvor) lyser upp mörker och tänder gamla eldfat. Den drar olja; Pell och Mags säljer mer.
- **Röda drycker** läker fyra hjärtan. Cello kan bära tre.
- **Pells butik** i Willowmere: lykta, lampolja, röd dryck och nytt svärd. Mags vid korsvägen säljer olja och drycker lite dyrare.

### Folk och uppdrag

- **Ysolde**, spåkvinnan i Willowmere, vet alltid vad nästa steg är, och hennes ord sparas i föremålsmenyn.
- **Brindle:** Hollis häst sprang iväg när stormen kom. Den som hittar henne på fältet och berättar det för Hollis får en belöning.
- En **gömd kista** under ett vakttorn på fältet syns bara när eldfatet där brinner.
- Vila och spara vid lägereldar (Aetheria, ranchen, korsvägen, Stormreach), på värdshuset och i Cellos egen säng. Dör Cello börjar han om där han kom in i området.

### Musiken

| Plats eller händelse | Spår |
| --- | --- |
| Titelskärmen | Hymn of the Wandering Hero |
| Cellos hem och den brinnande byn | Fields at Dawn |
| Vägen in i byn efter vrålet, och när Cello bär Maren | Whispers of the Hollow Woods |
| Byn efteråt | Fields of the Forgotten Crown, och Village at First Light när Hrungnir är besegrad |
| Aetheria | The Hearth and the Meadow |
| Lyras berättelse och Galewind Pass | The Quiet Hour Before Quest |
| The Long Bridge, och när stenar och dörrar vaknar | Ballad of the Wandering Hero |
| Thistledown Ranch | The Green Road Calls |
| The Stormvale | Gallop Across the Wildlands |
| Willowmere och butiken | Morning in Willowmere |
| Stormreach och fästningens förgård | March of the Hollow Crown |
| The Hollow Cave | Whispers of the Hollow Woods |
| Inne i fästningen | The Hollow Mask Watches |
| Järnväktaren | March of the Hollow Crown |
| Titanen i prologen och Hrungnir | The Warlord's Approach |
| Segern och vägen hem | Dawn Over the Kingdom |

Spåren ligger i `music/` (128 kbit/s MP3). När spelet publiceras som artifact skickas de med som separata filer.

## Vad var nytt i 0.5

- **Musik:** soundtracket *Hearth of the Hollow* (Treblo) ersatte den genererade musiken. Spåren tonar in i varandra och platsspår fortsätter där de slutade. `N` slår av och på musiken.
- **Nya modeller:** Cello, folket och asklingarna är formade låg-polyfigurer med knän, armbågar, ansikten och kläder.
- **Krukor** som går sönder, en **kamera** som backar vid stora fiender, och en lite tuffare **Hrungnir**.

## Kontroller

| Tangent | Gör |
| --- | --- |
| W A S D | Spring (C växlar till att gå) |
| Mus | Kamera (första klicket låser musen, Esc släpper) |
| Space | Hoppa |
| Shift | Rulla, sidohopp och bakåtvolt vid lock-on |
| Vänsterklick | Svärd, tre slag i rad |
| Högerklick / R | Sköld |
| Q / mittenklick | Lås fast på fiende |
| E | Prata, öppna kistor, läsa, gå in genom dörrar |
| F · G · V | Föremålen på snabbknapparna (från början markslag på F och tung vikt på G) |
| Tab / B | Föremålsmenyn: välj föremål och lägg dem på F, G eller V |
| K | Karta över området och en översikt över riket (pausar spelet) |
| M · N · P · H · I | Ljud · musik · retroläge · dölj hjälpen · felsökningsinfo |

Handkontroll: A hopp, X svärd, B rulla, RT sköld, LT lås, Y prata, RB/LB/höger på styrkorset föremålsknapparna, Start föremålsmenyn, Back karta.
På mobil styr vänster halva av skärmen Cello och höger halva kameran; knapparna sitter nere till höger.

## Vad finns i 0.4

- **Vägen hem.** Spelet börjar på lägret i skogen söder om byn. Cello går hem över två broar, hör ett vrål, och vid byns port visar kameran att allt brinner.
- **Större öar.** Byn, Aetheria och de andra öarna är ungefär dubbelt så stora, med fler brända hus, eldar och rökpelare.
- **Stenvägen norrut.** Efter samtalet om titanerna väcker Lyra stenporten i norr, och en väg av flytande stenar reser sig mot fästningen.
- **The Tempest Bastion** – den första fästningen (dungeon), med nio rum, karta, små nycklar och en Stormnyckel:
  - **Förhallen** med kartkistan och en kopparplatta som leder till vindbryggan.
  - **Vaktsalen**, ett fällrum där gallret slår igen tills alla fiender är besegrade.
  - **Smideshallen** med minibossen **Järnväktaren** (en jättelik askling med sköld och yxa) och Mjölnirs skärva.
  - **Kondensatorrummet**: två plattor måste få blixt nästan samtidigt för att buren kring en kista ska lyftas. Här finns också smedens verkstad och ett brev.
  - **Vindbryggan**: en smal bro där stormen blåser Cello ner, om han inte bär hammaren tungt.
  - **Den spräckta salen**: golvet brister under tung vikt, och i **källaren** ligger Stormnyckeln. En lucka leder upp igen.
  - **Hrungnirs krets**: bossen **Hrungnir**, jätten med hjärta av sten. Bara blixten från de fyra stormpelarna får honom på knä.
- **Mjölnirs skärva:** markslaget (F) skickar blixt genom kopparrännor, krossar sköldar och skadar bossar; tung vikt (G) gör Cello tung och långsam men orubblig i stormen.
- **Fiender:** asklingar, sköldvakter (skölden tar emot svärdet men krossas av hammaren) och stormfladdrare.
- **Föremålsfanfar** när Cello hittar något, en **hjärtbehållare** efter bossen, och en virvel som bär honom hem.
- **Stormstenen i öster:** slå på kopparplattan med hammaren, så reser sig en stenväg mot udden, där nästa område skymtar.
- **Brevet till Kael:** valet i prologen avgör vad Kael säger, och om Cello får smedens handskar (snabbare markslag).
- **Karta (K)** över fästningen, eller över öarna när Cello är utomhus.
- Sparning sker automatiskt vid viktiga händelser; dör Cello i fästningen börjar han om vid ingången.

## Kodens delar

| Fil | Innehåll |
| --- | --- |
| `src/main.js` | Startar allt, spelslingan, avståndsgallring av saker långt bort |
| `src/areas.js` | Områdena: var och en har sin egen grupp, sitt kollisionsträd, ingångar och utgångar |
| `src/build.js` | Byggverktygen alla områden använder: öar, vägar, broar, hus, ladan, träd, staket, eldar, dimma vid gränserna |
| `src/world.js` | Cellos hem, byn och Aetheria, fästningens område, och kopplingen mellan områdena |
| `src/regions/` | `ranch.js`, `pass.js`, `field.js`, `willowmere.js`, `stormreach.js` (med grottan) och `interiors.js` (butiken och Cellos hus) |
| `src/folk.js` | Folket ute i världen, butikerna, kistorna, eldfaten, djuren och övningsdockan |
| `src/inventory.js` | Föremålsmenyn, snabbknapparna, skärvorna, lyktan och dryckerna |
| `src/bastion.js` | The Tempest Bastion: rum, dörrar, kistor, kretsar, pussel, fällor och bossarna |
| `src/bosses.js` | Järnväktaren och Hrungnir |
| `src/enemies.js` | Asklingar, sköldvakter och stormfladdrare |
| `src/player.js` | Cello: rörelse, svärd, sköld, hammaren, tung vikt |
| `src/story.js` | Berättelsen, samtal, val, föremål och sparning |
| `src/collide.js` | Kollisioner mot världen plus rörliga lådor (dörrar, stenar, golv) |
| `src/lights.js` | En pool med åtta punktljus som flyttas till eldarna närmast Cello |
| `src/items.js` | Föremålens modeller och texter |
| `src/map.js` | Kartan |
| `src/geom.js` | Gemensamma geometrihjälpare och sammanslagning av statiska föremål |
| `src/audio.js` | Alla ljudeffekter, skapade med Web Audio |
| `src/music.js` | Musiken: vilket spår som spelas, övertoningar och sänkning under samtal |
| `src/pots.js` | Krukor som går sönder och ibland ger hjärtan |
| `src/hud.js`, `src/dialog.js`, `src/input.js`, `src/cameraRig.js`, `src/combat.js`, `src/effects.js`, `src/npcs.js`, `src/sky.js`, `src/textures.js`, `src/titan.js` | Gränssnitt, textrutor, styrning, kamera, strid, effekter, folk, himmel, texturer och titanen |

Three.js r186 ligger i `lib/three` så att spelet fungerar utan internet.
