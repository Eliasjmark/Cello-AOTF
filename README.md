# Cello: Ashes of the Fallen

Ett 3D-äventyr i världen The Shattered Realm, flytande öar i en evig storm, byggt med [Three.js](https://threejs.org) och spelbart direkt i webbläsaren.

**Version:** prototyp 0.10 · The Deepening Pyramid (pyramiden fem gånger så stor; fas 8 och 9 står näst på tur i utvecklingsplanen)

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

## Vad är nytt i 0.10: pyramiden blev djupare

Pyramiden har fått samma behandling som fästningen i 0.8: den gamla delen är första våningen, och fyra nya delar laddas när Cello går genom trappor och dörrar (en kort övertoning, ingen dimma). Solögonen i Spegelgalleriet ger inte längre Solnyckeln: de öppnar en dörr i västra väggen och en trappa ner. Solnyckeln ligger nu högst upp.

| Del | Vad som händer |
| --- | --- |
| **The Sunken Galleries** | *Den kluvna solens sal:* en ny **solkristall** delar strålen i två, åt vänster och höger. Fyra speglar ska leda båda halvorna till två ögon samtidigt. *De glidande speglarna:* speglar på stenblock som skjuts med tung vikt (strålen går över blocket, men stenblock stoppar den). *Sandfloden:* sand som rinner i stötar mot ett schakt. Med tung vikt står Cello emot, men den lösa sanden sväljer honom, och sandridåer rasar från taket i takt. *Balsamerarnas valv:* fällrum i tre vågor med skuggor och fyra eldfat som lyfter en bur |
| **The Hall of the Sun Barque** | *Solbåtens sal:* fällrum i tre vågor runt solbåten. *Timmarnas sal:* en spegel som vrider sig själv som en solvisare. Står Cello tungt på bromsplattan stannar den, så att strålen hinner bränna bort tre skuggslöjor framför solögonen (slöjorna läker om ljuset försvinner för tidigt). *Solväktaren:* en ny miniboss i guld. Skölden tar både svärd och hammare, men reflekterat solljus från prisman bländar den |
| **The Inner Ascent** | En lång ramp där **stenkulor** rullar ner. Bara nischerna i väggarna skyddar. Sedan **timglaset**: vänd det, så stiger sanden i en grop och sjunker i två andra. En väg leder ner till en skattkammare, en annan över sanden till dörren upp |
| **The Apex of Ra** | Ljuset från toppen, två solkristaller, en kristall på ett block som ska skjutas på plats, två speglar och **fyra solögon som måste lysa på en gång**. Sedan Solnyckeln och en ljusränna rakt ner till Apophis dörr |

Små nycklar: K1 (de glidande speglarna) → dörren till sandfloden · K2 (sandfloden) → valvets norra dörr · K3 (timglasets skattkammare) → dörren upp till toppen.

Nytt i koden: `src/sunkit.js` (solljus, solkristaller, spegel- och kristallblock, solvisaren, sandfall, stenkulor, timglas och sandgropar, Solväktaren) och `src/pyramidwings.js` (pyramidens fyra nya delar). Blockpusslen är kontrollerade med en lösare. Verktygslådan `dkit.js` har fått material per tema, sandströmmar och lös sand. Den räknar inte längre en platta som kan rasa som säker plats att återuppstå på. Galler från en bossstrid går upp igen om Cello dör.

## Vad är nytt i 0.9: startmenyn

När spelet startar möter Cello spelaren i stormen: modellen som Elias skickade av hur Cello ska se ut när spelet är klart, målad och upplyst av eld bakifrån, med blixtar, glöd som stiger och aska som faller. Bredvid står logotypen i guld.

- **Tryck på valfri tangent** (eller tryck på skärmen) så öppnas menyn: *Continue*, *New Game*, *Load Game*, *Options*, *How to Play* och *Credits*.
- **Två sparfiler.** Fil 1 och fil 2 visar plats, hjärtan, skärvor, speltid, reliker och när filen sparades senast.
  - *Continue* fortsätter filen som spelades senast.
  - *New Game* frågar vilken fil resan ska sparas i, och varnar innan en gammal resa skrivs över.
  - En fil kan startas, kopieras till den andra platsen eller raderas, alltid med en fråga först.
  - En sparning från 0.8 eller tidigare flyttas automatiskt till fil 1.
- **Options:** musikens och ljudeffekternas volym (0–10) och retroläget. Inställningarna sparas.
- **Ljud:** menyn har egna ljud (markören, välj, tillbaka, nej, radera) och en stor åskknall när resan börjar. Musiken är *Hymn of the Wandering Hero*.
- Menyn går att styra med tangentbord (piltangenter eller WASD, Enter, Esc), mus, pekskärm och handkontroll.
- På mobil står logotypen överst, Cello i mitten och menyn längst ner.

Hjältemodellen ligger i `models/cello-hero.bin` (89 000 trianglar, 0,9 MB). Den görs av `tools/hero/paint.py` från STL-filen `tools/hero/cello-hero.stl`: modellen förenklas, och varje del får en färg (hud, hår, pannband, tunika, läder, svärd och sköld) plus mörkare skrymslen och ljusare kanter.

## Vad är nytt i 0.8: fästningen blev djupare

Elias klarade båda fängelsehålorna på 5–10 minuter. Målet är 30–60 minuter per fängelsehåla, så **The Tempest Bastion** har fått fyra nya delar. Den gamla fästningen är nu bara första våningen. Delarna laddas när Cello går genom trappor, dörrar och hissar, med en kort övertoning men ingen dimma (dimman finns bara mellan områdena ute i världen).

| Del | Var | Vad som händer |
| --- | --- | --- |
| **The Lightning Cisterns** | Trappan väster om källaren | **Växlar:** kopparpilar som styr blixten från en platta (vrids med E, plattan slås med hammaren) till dörrar, en bur med en nyckel, eller en trasig ränna. **Järnblock:** tre block på ett rutnät, två tryckplattor, minst 17 skjut med tung vikt (en spak ställer tillbaka blocken). **Lyktvalvet:** fyra eldfat i mörkret lyfter en bur. **Två spolar** i två olika salar måste laddas inom tio sekunder för att öppna trappan ner |
| **The Deep Forge** | Under cisternerna | **Fällsalen:** tre vågor fiender bakom galler. **Den spruckna smedjan:** bälgar blåser västerut i stötar över ett schakt. Med tung vikt står Cello emot vinden, men de spruckna plattorna rasar under honom. Smala järnbalkar håller. **Dynamon:** tre blixtar i rätt ordning (söder, väster, öster) får det stora hjulet att snurra, och då vaknar hissen i tornet |
| **The Thunder Spire** | Dörren österut från vindbryggan | Hissen (som bara går när dynamon snurrar), **stormgången** runt tornet där tre plattor måste slås inom 16 sekunder i stötvisa vindar, och **klocksalen** med fler växlar, en nyckel och dörren upp |
| **The Storm Crown** | Högst upp | **The Twin Wardens**: två Järnväktare samtidigt. Sedan **Stormnyckeln** och en stormvirvel som släpper ner Cello framför Hrungnirs dörr |

Nycklarna: K3 (cisternernas bur) → dörren norrut i cisternerna · K4 (lyktvalvet) → dynamosalen · K5 (klocksalen) → kronan. Stormnyckeln ligger inte längre i källaren utan högst upp i kronan.

Kartan (K) visar våningen Cello står på, med blixtens kopparbanor, växlar, plattor, spolar, dörrar och kistor.

Nya filer: `src/dkit.js` (en verktygslåda för fängelsehålor: salar, dörrar, kistor, burar, blixtnätet, kondensatorer, tryckplattor, järnblock, spruckna golv, stormvind, fällrum och hissar) och `src/bastionwings.js` (fästningens fyra nya delar). Pyramiden byggs om med samma verktygslåda i nästa version.

## Vad är nytt i 0.7: öknen och pyramiden

### Den gyllene porten och The Ember Wastes

Kopparplattan framför **den gyllene porten** på fältets östra udde väcks med hammarens markslag, precis som stormstenen. Porten slår upp och en bro leder ut i **The Ember Wastes**: ett ökenland lika stort som fältet, med dyner, halvt begravda ruiner (ett fallet kungahuvud, en sfinx, en pelarsal och ett begravt tempel med en kista), obelisker längs vägen och längst i öster en stor trappa upp till pyramiden som svävar över avgrunden.

- **Oasen Sunwell** är öknens fristad: en damm med palmer, tält, en eld att vila vid och två kameler.
  - **Nefret**, den sista prästinnan av Ra, vet hur pyramiden fungerar och ger tips längs vägen.
  - **Hamid** säljer lampolja, röda drycker och ett nytt böjt ökensvärd.
  - Barnet **Sabi** springer runt dammen.
- **Valet vid karavanen.** Handelsmannen **Tarek** ligger fast under en vagn som asklingar har vält, med en full börs bredvid sig.
  - *Lyft vagnen:* han haltar till oasen och ger Cello sin **slipsten** (svärdet slits hälften så fort).
  - *Ta börsen:* Cello får 60 skärvor, men Tarek försvinner och hans kusin Hamid tar 50 % mer betalt av tjuven.

### The Sun-Scorched Pyramid

Den andra fängelsehålan har sju salar, karta, två små nycklar och en Solnyckel. Allt bygger på solljus:

- **Solstrålar** faller in genom fönster och ner genom schakt i taket.
- **Speglar** vrids ett åttondels varv i taget (E) och kastar strålen vidare.
- **Solögon** vaknar när ljuset träffar dem. Vissa lyser bara så länge strålen ligger kvar.
- **Skuggslöjor** brinner upp i solljus.
- **Skuggvarelser** som svärdet går rakt igenom blir fasta när ljuset bränner dem.

| Sal | Vad som händer |
| --- | --- |
| **Förkammaren** | Kartkistan, och en spegel som vänds så att ljuset väcker ögat över dörren till solgården |
| **Solgården** | Två speglar leder ljuset till ett öga som lyfter guldburen runt den första nyckeln |
| **Skuggkryptan** | Ett fällrum med den andra nyckeln, och en skuggslöja framför en alkov med en guldskärva (värd 100) |
| **Ras sal** | Ett ljusschakt mitt i salen och en slöja framför dörren i väster |
| **Skarabégropen** | Minibossen **Khepri**, en jätteskarabé. Svärdet studsar på skalet: vänd den på rygg med markslaget och hugg buken. Sedan stiger **Ra's Shattered Prism** upp ur sanden |
| **Spegelgalleriet** | Två solögon måste se solen samtidigt: ett får fönstrets ljus via två speglar, det andra ljuset Cello själv kastar från schaktet via en tredje spegel |
| **Apophis helgedom** | Bossen **Apophis**, kaosormen av skugga, som reser sig ur fyra hål i golvet |

**Ra's Shattered Prism** läggs på en föremålsknapp. Med prisman uppe fångar Cello en stråle (i ett fönsters ljus eller under ett schakt) och kastar den dit han tittar. Med lock-on (Q) siktar han rakt på ett solöga, en spegel, en slöja eller en fiende.

Apophis tar bara skada av solljus som studsar tillbaka: ställ dig i ljuset mitt i helgedomen, höj prisman och lås fast på ormen. Då faller huvudet ner och ädelstenen i pannan går att hugga.

### Titanernas hemlighet

Lyra vet inte längre allt från början. Hon har läst de gamla stenarna och känner till gudarnas reliker, men inte vad titanerna vill.

Det berättar **Apophis**, den tredje titanen Cello möter, när han faller:
- att titanerna var gudarnas äldsta fiender, fängslade djupt under jorden;
- att de bröt sig loss och brände Olympus;
- att de blir starkare för varje människa som dör;
- att det enda de vill är en tyst, tom värld för sig själva.

Ljuset bär sedan Cello hem till Lyra i Aetheria.

### Grumble, bocken man rider på

Den som hittar hästen Brindle på fältet och berättar det för Hollis på Thistledown Ranch får **Grumble**, gårdens jättelika bock, och **hornet** som kallar på honom.
- Grumble springer dubbelt så fort som Cello och hoppar längre. Han är tänkt som resesättet innan Hermes sandaler finns.
- Lägg hornet på en föremålsknapp och blås i det utomhus, så kommer Grumble springande.
- **E** kliver upp och ner.
- Han väntar utanför grottor, hus och fängelsehålor. Blir Cello träffad ramlar han av.

### Smygandet i prologen

Väljer Cello att bära Maren till Aetheria ger sig titanen inte av längre. Den går fram och tillbaka längs muren i norr och spanar över torget. Ett rött ljus på marken visar vart den tittar, och husen, muren och klippan skymmer den. Ser den Cello en stund vrålar den, och han får börja om där Maren låg.

### Övrigt

- **The Stormvale** har fått ett långsammare och kusligare spår: *Fields of the Forgotten Crown*. Ett nattligt fält i moll i stället för den glada galoppen.
- I öknen hörs *Whispers of the Hollow Woods*, och vid oasen *The Quiet Hour Before Quest*. I pyramiden *The Hollow Mask Watches*, vid Khepri *March of the Hollow Crown*, vid Apophis *The Warlord's Approach* och efter segern *Dawn Over the Kingdom*.
- Kartan har en egen vy för pyramiden, och översikten över riket visar öknen och pyramiden.
- Nya röster för Nefret, Hamid, Sabi, Tarek, Wren och Apophis.

## Vad var nytt i 0.6: en större värld

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
| The Stormvale | Fields of the Forgotten Crown (från 0.7) |
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
  - **Den spräckta salen**: golvet brister under tung vikt, och i **källaren** låg Stormnyckeln (sedan 0.8 leder källaren vidare ner, och nyckeln ligger i kronan). En lucka leder upp igen.
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
| `src/world.js` | Cellos hem, byn och Aetheria, fästningens och pyramidens områden, och kopplingen mellan områdena |
| `src/regions/` | `ranch.js`, `pass.js`, `field.js`, `willowmere.js`, `stormreach.js` (med grottan), `desert.js` (The Ember Wastes) och `interiors.js` (butiken och Cellos hus) |
| `src/folk.js` | Folket ute i världen, butikerna, kistorna, eldfaten, djuren och övningsdockan |
| `src/inventory.js` | Föremålsmenyn, snabbknapparna, skärvorna, lyktan och dryckerna |
| `src/bastion.js` | The Tempest Bastion: rum, dörrar, kistor, kretsar, pussel, fällor och bossarna |
| `src/title.js` | Startmenyn: scenen med hjälten, menyerna, de två sparfilerna och inställningarna |
| `src/heroModel.js` | Läser hjältemodellen (`models/cello-hero.bin`) |
| `src/pyramidwings.js` | Pyramidens fyra nya delar (0.10): djupet, solbåten, uppstigningen och toppen |
| `src/sunkit.js` | Pyramidens verktygslåda: solljus, kristaller, spegelblock, solvisaren, sandfall, stenkulor, timglaset och Solväktaren |
| `src/bastionwings.js` | Fästningens fyra nya delar (0.8): cisternerna, smedjan, tornet och kronan |
| `src/dkit.js` | Verktygslådan för fängelsehålor: salar, dörrar, blixtnätet, kondensatorer, järnblock, spruckna golv, stormvind, fällrum och hissar |
| `src/bosses.js` | Järnväktaren och Hrungnir |
| `src/pyramid.js` | The Sun-Scorched Pyramid: salar, dörrar, kistor, burar, speglar, solögon, slöjor, fällor och bossarna |
| `src/beams.js` | Solstrålarna: fönster, schakt, speglar, solögon, slöjor och prisman |
| `src/sunbosses.js` | Khepri och Apophis |
| `src/goat.js` | Grumble, bocken man rider på |
| `src/enemies.js` | Asklingar, sköldvakter och stormfladdrare |
| `src/player.js` | Cello: rörelse, svärd, sköld, hammaren, tung vikt, prisman och ridning |
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
