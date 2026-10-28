/* ============================================================================
   Twins Disney Trip 2026 — park maps.

   The images in /maps are the map halves of Disney's own paper guidemaps,
   cut out of the PDFs: page 2 of each guidemap, cropped at the gutter so only
   the illustration survives (the numbered attraction lists and the legend are
   dropped). Two sizes ship for each park:

     <park>-sm.webp    ~780px — cached by the service worker, paints instantly
     <park>-full.webp  native — swapped in once it arrives, what you zoom into

   `img.w` / `img.h` are the pixel dimensions of the FULL image. They set the
   aspect ratio, which is all the pin maths needs.

   HOW TO EDIT
   -----------
   Every pin lives in `places`. Coordinates are fractions of the image:
   x = 0 is the left edge, x = 1 the right; y = 0 is the top, y = 1 the bottom.
   To find them, open the map, zoom to the spot and read the position off —
   or measure on the source image and divide by its width/height.

     { id: 'tron', name: 'TRON Lightcycle / Run', land: 'Tomorrowland',
       x: 0.925, y: 0.285 }

   An agenda item is tied to a pin in one of two ways:

     1. `place: 'tron'` on the item in data.js — always wins, use it when the
        agenda wording differs from the attraction name.
     2. Otherwise the item title is matched against each place's `name` and
        `alias` list. EXACT matches only (case, quotes and punctuation are
        ignored), so "Space Mountain" finds its pin on its own and nothing
        is ever tied to the wrong ride by accident.

   `extra: true` marks a pin that isn't on our agenda at all — the big rides
   worth knowing about during a "free time for rides" block. They render muted
   and can be switched off.
   ========================================================================== */

const PARK_MAPS = [
  /* ------------------------------------------------- Animal Kingdom, day 2 -- */
  {
    key: 'ak',
    theme: 'animal',
    name: 'Animal Kingdom',
    full: "Disney's Animal Kingdom",
    days: [2],
    credit: "Disney's Animal Kingdom guidemap · March 2025",
    img: { sm: 'maps/ak-sm.webp', full: 'maps/ak-full.webp', w: 2100, h: 2252 },
    places: [
      { id: 'gate', name: 'Park entrance', land: 'Oasis', kind: 'gate',
        x: 0.504, y: 0.861,
        note: 'Bag check and the tapstiles. Everything funnels through the Oasis into Discovery Island.' },
      { id: 'buses', name: 'Bus stops', land: 'Entrance', kind: 'gate',
        x: 0.397, y: 0.969,
        note: 'Where the Art of Animation bus drops off and picks up. No Skyliner or monorail here.' },
      { id: 'fop', name: 'Avatar Flight of Passage', land: 'Pandora — The World of Avatar',
        x: 0.129, y: 0.785,
        note: "Back left corner of the park, about a 10 minute walk from the gate. Go straight there." },
      { id: 'navi', name: "Na'vi River Journey", land: 'Pandora — The World of Avatar',
        x: 0.219, y: 0.844, extra: true,
        note: 'Gentle boat ride, no height limit. Right next to Flight of Passage.' },
      { id: 'yak', name: 'Yak & Yeti', land: 'Asia', kind: 'meal',
        x: 0.501, y: 0.341,
        note: 'Across the bridge from Discovery Island, on the way into Asia.' },
      { id: 'tree', name: 'Tree of Life', land: 'Discovery Island', kind: 'show',
        x: 0.358, y: 0.420, extra: true,
        note: 'The centre of the park. Walk the Discovery Island Trails around the roots to find the carvings.' },
      { id: 'safaris', name: 'Kilimanjaro Safaris', land: 'Africa',
        x: 0.149, y: 0.248, extra: true,
        note: 'Open-sided truck through the savanna. Best early, while the animals are still moving.' },
      { id: 'lionking', name: 'Festival of the Lion King', land: 'Africa', kind: 'show',
        x: 0.080, y: 0.411, extra: true,
        note: 'Air-conditioned 30 minute show in a big covered theatre. Good for the twins.' },
      { id: 'everest', name: 'Expedition Everest', land: 'Asia',
        x: 0.804, y: 0.362, extra: true,
        note: 'Roller coaster with a backwards section. 44"/112 cm.' },
      { id: 'dinosaur', name: 'DINOSAUR', land: 'DinoLand U.S.A.',
        x: 0.647, y: 0.817, extra: true,
        note: 'Dark, loud and jerky. 40"/102 cm.' },
    ],
  },

  /* --------------------------------------------- Magic Kingdom, days 3 & 7 -- */
  {
    key: 'mk',
    theme: 'magic',
    name: 'Magic Kingdom',
    full: 'Magic Kingdom',
    days: [3, 7],
    credit: 'Magic Kingdom guidemap · September 2023',
    img: { sm: 'maps/mk-sm.webp', full: 'maps/mk-full.webp', w: 1375, h: 1350 },
    places: [
      { id: 'gate', name: 'Park entrance', land: 'Main Street, U.S.A.', kind: 'gate',
        x: 0.545, y: 0.885,
        note: 'Bag check, then the tapstiles under the railroad station. Buses and the ferry all arrive below this.' },
      { id: 'mainst', name: 'Main Street, U.S.A.', land: 'Parade & fireworks', kind: 'show',
        short: 'Main Street',
        x: 0.545, y: 0.660,
        note: 'The parade comes down from Frontierland, around the hub and out along Main Street. Also the easiest place to stand for the fireworks.' },
      { id: 'castle', name: 'Cinderella Castle', land: 'Fantasyland', kind: 'show',
        x: 0.548, y: 0.322,
        note: 'Happily Ever After projects onto the castle. The hub lawns in front of it are the classic view.' },
      { id: 'smallworld', name: "it's a small world", land: 'Fantasyland',
        x: 0.429, y: 0.224,
        note: 'Indoor boat ride, no height limit, fully air-conditioned.' },
      { id: 'peterpan', name: "Peter Pan's Flight", land: 'Fantasyland',
        x: 0.450, y: 0.264,
        note: 'Right next door to small world. Suspended ride, gentle.' },
      { id: 'pooh', name: 'The Many Adventures of Winnie the Pooh', land: 'Fantasyland',
        x: 0.668, y: 0.272,
        note: 'East side of Fantasyland, past the carrousel.' },
      { id: 'sevendwarfs', name: 'Seven Dwarfs Mine Train', land: 'Fantasyland',
        x: 0.627, y: 0.237, extra: true,
        note: 'Family coaster that swings side to side. 38"/97 cm.' },
      { id: 'carrousel', name: 'Prince Charming Regal Carrousel', land: 'Fantasyland',
        x: 0.524, y: 0.264, extra: true,
        note: 'Right behind the castle. Everyone can ride.' },
      { id: 'hauntedmansion', name: 'Haunted Mansion', land: 'Liberty Square',
        x: 0.324, y: 0.272,
        note: 'Slow indoor ride in the dark. No height limit, but it is properly spooky.' },
      { id: 'skipper', name: 'Jungle Navigation Co. Skipper Canteen', land: 'Adventureland', kind: 'meal',
        x: 0.363, y: 0.515,
        note: 'Tucked behind the Jungle Cruise. Indoors and quiet, which matters at 4:25 PM with sixteen of us.' },
      { id: 'pirates', name: 'Pirates of the Caribbean', land: 'Adventureland',
        x: 0.143, y: 0.578,
        note: 'Indoor boat ride with one small drop. No height limit.' },
      { id: 'tiana', name: "Tiana's Bayou Adventure", land: 'Frontierland',
        x: 0.072, y: 0.410,
        note: 'The old Splash Mountain, back left of the park. 40"/102 cm — and you will get wet.' },
      { id: 'tron', name: 'TRON Lightcycle / Run', land: 'Tomorrowland',
        x: 0.925, y: 0.285,
        note: 'Far right of the park, behind Space Mountain. 48"/122 cm.' },
      { id: 'spacemountain', name: 'Space Mountain', land: 'Tomorrowland',
        x: 0.927, y: 0.463,
        note: 'Indoor coaster in the dark. 44"/112 cm.' },
      { id: 'buzz', name: "Buzz Lightyear's Space Ranger Spin", land: 'Tomorrowland',
        x: 0.782, y: 0.547,
        note: 'Shooting gallery ride. No height limit, everyone can ride.' },
    ],
  },

  /* ---------------------------------------------- Hollywood Studios, day 4 -- */
  {
    key: 'hs',
    theme: 'studios',
    name: 'Hollywood Studios',
    full: "Disney's Hollywood Studios",
    days: [4],
    credit: "Disney's Hollywood Studios guidemap · March 2023",
    img: { sm: 'maps/hs-sm.webp', full: 'maps/hs-full.webp', w: 1162, h: 1350 },
    places: [
      { id: 'gate', name: 'Park entrance', land: 'Hollywood Boulevard', kind: 'gate',
        x: 0.445, y: 0.845,
        note: 'Bag check, then straight up Hollywood Boulevard. Toy Story Land is up and to the right.' },
      { id: 'skyliner', name: 'Skyliner & buses', land: 'Entrance', kind: 'gate',
        x: 0.385, y: 0.935,
        note: 'Skyliner station is left of the entrance plaza. Change at Caribbean Beach for Art of Animation.' },
      { id: 'tsland', name: 'Toy Story Land', land: 'Toy Story Land', kind: 'show',
        x: 0.570, y: 0.225,
        note: 'About a 10 minute walk from the gate, up past Echo Lake and Animation Courtyard.' },
      { id: 'slinky', name: 'Slinky Dog Dash', land: 'Toy Story Land',
        x: 0.646, y: 0.200,
        note: 'Family coaster, no big drops. 38"/97 cm.' },
      { id: 'tsmania', name: 'Toy Story Mania!', land: 'Toy Story Land',
        x: 0.533, y: 0.317,
        note: '4D shooting game. No height limit — all sixteen of us can ride.' },
      { id: 'rodeo', name: 'Roundup Rodeo BBQ', land: 'Toy Story Land', kind: 'meal',
        x: 0.637, y: 0.344,
        note: 'Inside Toy Story Land, a two minute walk from Slinky and Mania.' },
      { id: 'swirl', name: 'Alien Swirling Saucers', land: 'Toy Story Land',
        x: 0.478, y: 0.167, extra: true,
        note: 'Gentle spinner. 32"/81 cm.' },
      { id: 'rotr', name: 'Star Wars: Rise of the Resistance', land: "Star Wars: Galaxy's Edge",
        x: 0.214, y: 0.315,
        note: 'Top left of the park, deep inside Galaxy\u2019s Edge. Allow 15 minutes to walk there. 40"/102 cm.' },
      { id: 'smugglers', name: 'Millennium Falcon: Smugglers Run', land: "Star Wars: Galaxy's Edge",
        x: 0.226, y: 0.111, extra: true,
        note: 'Fly the Falcon. 38"/97 cm.' },
      { id: 'frozensing', name: 'Frozen Sing-Along', land: 'Echo Lake', kind: 'show',
        x: 0.329, y: 0.591,
        note: 'Hyperion Theater, indoors and air-conditioned. 30 minute show.' },
      { id: 'runaway', name: "Mickey & Minnie's Runaway Railway", land: 'Hollywood Boulevard',
        x: 0.459, y: 0.526, extra: true,
        note: 'Inside the Chinese Theatre at the top of Hollywood Boulevard. No height limit.' },
      { id: 'tot', name: 'Tower of Terror', land: 'Sunset Boulevard',
        x: 0.704, y: 0.855,
        note: 'The tall brick hotel at the far end of Sunset Boulevard. 40"/102 cm.' },
      { id: 'fantasmic', name: 'Fantasmic!', land: 'Sunset Boulevard', kind: 'show',
        x: 0.648, y: 0.816,
        note: 'Hollywood Hills Amphitheater, behind Tower of Terror. Huge open-air theatre — get in 30 minutes early so all sixteen of us sit together.' },
    ],
  },

  /* -------------------------------------------------------- EPCOT, day 6 -- */
  {
    key: 'ep',
    theme: 'epcot',
    name: 'EPCOT',
    full: 'EPCOT',
    days: [6],
    credit: 'EPCOT guidemap · July 2026',
    img: { sm: 'maps/ep-sm.webp', full: 'maps/ep-full.webp', w: 2100, h: 2445 },
    places: [
      { id: 'gateway', name: 'International Gateway', land: 'World Showcase', kind: 'gate',
        x: 0.795, y: 0.290,
        note: 'The back entrance, and where the Skyliner drops us. France is a two minute walk from the tapstiles — which is the whole reason we rope drop Remy from here.' },
      { id: 'gate', name: 'Main entrance', land: 'World Celebration', kind: 'gate',
        x: 0.442, y: 0.943,
        note: 'The front gate under Spaceship Earth. Buses and the monorail arrive here, not at the Gateway.' },
      { id: 'remy', name: "Remy's Ratatouille Adventure", land: 'France',
        x: 0.781, y: 0.119,
        note: 'No Lightning Lane needed and no height limit — everyone can ride. Straight up from the International Gateway.' },
      { id: 'soarin', name: "Soarin' Around the World", land: 'The Land',
        x: 0.730, y: 0.709,
        note: 'Hang-gliding simulator inside The Land pavilion. 40"/102 cm.' },
      { id: 'gardengrill', name: 'Garden Grill', land: 'The Land', kind: 'meal',
        x: 0.757, y: 0.717,
        note: "Chip 'n' Dale character meal, upstairs in the same pavilion as Soarin'. Walk out of the ride and you are there." },
      { id: 'ssearth', name: 'Spaceship Earth', land: 'World Celebration',
        x: 0.438, y: 0.875,
        note: 'The giant silver golf ball. Slow indoor ride, no height limit.' },
      { id: 'guardians', name: 'Guardians of the Galaxy: Cosmic Rewind', land: 'World Discovery',
        x: 0.288, y: 0.821,
        note: 'Indoor coaster that launches backwards. 42"/107 cm.' },
      { id: 'testtrack', name: 'Test Track', land: 'World Discovery',
        x: 0.253, y: 0.655,
        note: 'Design a car, then take it round the outdoor loop. 40"/102 cm.' },
      { id: 'frozen', name: 'Frozen Ever After', land: 'Norway',
        x: 0.112, y: 0.423,
        note: 'Boat ride through Arendelle. No height limit. Far side of the lagoon — allow 15 minutes to walk round.' },
      { id: 'moana', name: 'Journey of Water, Inspired by Moana', land: 'World Nature',
        x: 0.545, y: 0.793, extra: true,
        note: 'Walk-through water trail. Free to wander, and the twins can get wet.' },
      { id: 'nemo', name: 'The Seas with Nemo & Friends', land: 'World Nature',
        x: 0.567, y: 0.836, extra: true,
        note: 'Aquarium and a gentle indoor ride. Good for a cool-down.' },
    ],
  },
];
