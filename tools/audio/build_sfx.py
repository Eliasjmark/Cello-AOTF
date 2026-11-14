# Bygger sounds/sfx.json av ljudpaketet Elias skickade (400 Sounds Pack, 0.18).
#   python3 tools/audio/build_sfx.py <mapp med det uppackade paketet> [potatis-hello.mp3]
# Varje ljud trimmas (tystnad i början och slutet), görs mono, normaliseras och sparas som MP3 (base64 i JSON).
# Spelet läser filen i src/audio.js (i den fristående versionen är den inbakad).
import sys, os, json, base64, subprocess, tempfile, wave
import numpy as np

SRC = sys.argv[1]
POTATO = sys.argv[2] if len(sys.argv) > 2 else None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OUT = os.path.join(ROOT, 'sounds', 'sfx.json')

# namn i spelet: (fil i paketet, toppnivå 0–1)
S = {
  # --- menyer och knappar ---
  'ui_move': ('UI/select_2.wav', 0.7), 'ui_move2': ('UI/select_3.wav', 0.7), 'ui_select': ('UI/click_double_on.wav', 0.85),
  'ui_confirm': ('UI/synth_confirmation.wav', 0.8), 'ui_back': ('UI/cancel.wav', 0.8), 'ui_deny': ('UI/synth_error.wav', 0.7),
  'ui_toggle_on': ('UI/toggle_on.wav', 0.85), 'ui_toggle_off': ('UI/toggle_off.wav', 0.85),
  'ui_pop1': ('UI/pop_1.wav', 0.8), 'ui_pop2': ('UI/pop_2.wav', 0.8), 'ui_pop3': ('UI/pop_3.wav', 0.8), 'ui_pop4': ('UI/pop_4.wav', 0.8),
  'ui_open': ('Items/book_open.wav', 0.8), 'ui_close': ('Items/book_close.wav', 0.8), 'ui_page': ('Items/page_turn.wav', 0.7),
  'ui_map_open': ('Items/map_open.wav', 0.85), 'ui_map_close': ('Items/map_close.wav', 0.85),
  'ui_start': ('Musical Effects/harpsichord_level_start.wav', 0.8), 'ui_erase': ('Materials/paper_tear_1.wav', 0.8),
  'ui_click': ('Other/controller_button_press.wav', 0.8),
  # --- jinglar ---
  'jg_item': ('Musical Effects/vibraphone_chime_positive.wav', 0.75), 'jg_quick': ('Musical Effects/vibraphone_chime_quick.wav', 0.7),
  'jg_heart': ('Musical Effects/grand_piano_positive_long.wav', 0.75), 'jg_save': ('Musical Effects/harpsichord_chime_quick.wav', 0.7),
  'jg_rest': ('Musical Effects/harpsichord_inn.wav', 0.75), 'jg_defeat': ('Musical Effects/grand_piano_defeated.wav', 0.8),
  'jg_songok': ('Musical Effects/xylophone_chime_positive.wav', 0.75), 'jg_songbad': ('Musical Effects/xylophone_negative_quick.wav', 0.7),
  'jg_quest': ('Musical Effects/brass_chime_positive.wav', 0.75), 'jg_mystery': ('Musical Effects/music_box_mystery.wav', 0.7),
  'jg_levelup': ('Musical Effects/brass_level_complete.wav', 0.75), 'jg_deny': ('Musical Effects/grand_piano_negative_quick.wav', 0.6),
  # --- pengar och saker ---
  'coin': ('Items/coin_collect.wav', 0.75), 'gem': ('Items/gem_collect.wav', 0.75), 'coins': ('Items/coins_gather_quick.wav', 0.8),
  'coins_small': ('Items/coins_gather_small.wav', 0.75), 'heart': ('Items/heart_collect.wav', 0.75), 'equip': ('Items/item_equip.wav', 0.8),
  'weapon_equip': ('Weapons/weapon_equip_short.wav', 0.8), 'unsheath': ('Weapons/sword_unsheath.wav', 0.8), 'keys': ('Items/keys_jingling.wav', 0.6),
  # --- strid ---
  'swipe': ('Combat and Gore/swipe.wav', 0.75), 'whoosh1': ('Other/whoosh_1.wav', 0.7), 'whoosh2': ('Other/whoosh_2.wav', 0.7),
  'slice': ('Weapons/sword_slice.wav', 0.8), 'clash1': ('Weapons/sword_clash.wav', 0.85), 'clash2': ('Weapons/sword_clash_2.wav', 0.85),
  'punch1': ('Combat and Gore/punch.wav', 0.8), 'punch2': ('Combat and Gore/punch_2.wav', 0.8), 'punch3': ('Combat and Gore/punch_3.wav', 0.8),
  'crunch': ('Combat and Gore/crunch_quick.wav', 0.7), 'thud': ('Weapons/harsh_thud.wav', 0.85), 'poof': ('Environment/air_burst.wav', 0.75),
  'kick': ('Combat and Gore/kick.wav', 0.8),
  # --- Cello: röst och kropp ---
  'belch1': ('Human/belch_1.wav', 0.85), 'belch2': ('Human/belch_2.wav', 0.85), 'belch3': ('Human/belch_3.wav', 0.85),
  'cough1': ('Human/cough_short.wav', 0.7), 'cough2': ('Human/cough_double.wav', 0.7), 'whistle': ('Human/whistle.wav', 0.7),
  'cloth1': ('Materials/clothing_1.wav', 0.75), 'cloth2': ('Materials/clothing_2.wav', 0.75), 'cloththud': ('Materials/clothing_thud.wav', 0.8),
  # röstklipp (stavelser) till mumlet och Cellos rop
  **{f'man{i}': (f'Human/man_{i}.wav', 0.9) for i in range(11)},
  # --- miljö ---
  'door_open': ('Environment/door_open.wav', 0.8), 'door_creak': ('Environment/creaky_door_short.wav', 0.75), 'door_close': ('Environment/door_close.wav', 0.8),
  'lock_unlock': ('Environment/lock_unlock.wav', 0.85), 'lock_lock': ('Environment/lock_lock.wav', 0.85),
  'chest_creak': ('Environment/creaky_door_long.wav', 0.7), 'wood_hollow': ('Materials/wood_small_hollow.wav', 0.8),
  'pottery': ('Materials/pottery_clang.wav', 0.8), 'splash': ('Environment/water_splashing.wav', 0.8), 'drop': ('Environment/water_drop_medium.wav', 0.75),
  'drop_syn': ('Environment/water_drop_synthetic.wav', 0.6), 'match': ('Other/light_match.wav', 0.8), 'fire_light': ('Environment/fire_lighting.wav', 0.8),
  'stone_long': ('Materials/stone_push_long.wav', 0.8), 'stone_med': ('Materials/stone_push_medium.wav', 0.8), 'stone_short': ('Materials/stone_push_short.wav', 0.8),
  'glass_big': ('Materials/glass_ping_big.wav', 0.7), 'glass_small': ('Materials/glass_ping_small.wav', 0.7), 'ice': ('Environment/ice_in_water.wav', 0.7),
  'clock': ('Environment/clock_ticking.wav', 0.6), 'slurp': ('Other/drink_slurp.wav', 0.8), 'gurgle': ('Environment/gurgling.wav', 0.7),
  'metal_clang': ('Materials/metal_clang.wav', 0.75), 'snap': ('Other/snap.wav', 0.7),
  # --- fotsteg ---
  **{f'st_grass{i}': (f'Footsteps/digital/digital_footstep_grass_{i}.wav', 0.6) for i in range(1, 5)},
  **{f'st_snow{i}': (f'Footsteps/digital/digital_footstep_snow_{i}.wav', 0.6) for i in range(1, 5)},
  **{f'st_wood{i}': (f'Footsteps/digital/digital_footstep_wood_{i}.wav', 0.6) for i in range(1, 5)},
  **{f'st_gravel{i}': (f'Footsteps/foley_footstep_gravel_{i}.wav', 0.6) for i in range(1, 5)},
  **{f'st_stone{i}': (f'Footsteps/foley_footstep_concrete_{i}.wav', 0.6) for i in range(1, 5)},
}

def load(path):
    w = wave.open(path)
    n, ch, sr, sw = w.getnframes(), w.getnchannels(), w.getframerate(), w.getsampwidth()
    raw = w.readframes(n)
    if sw == 2: a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    elif sw == 3:
        b = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 3)
        a = ((b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16)) << 8 >> 8).astype(np.float32) / 8388608
    elif sw == 4: a = np.frombuffer(raw, dtype=np.int32).astype(np.float32) / 2147483648
    else: a = (np.frombuffer(raw, dtype=np.uint8).astype(np.float32) - 128) / 128
    return a.reshape(-1, ch).mean(1), sr

def process(a, sr, peak):
    # trimma tystnad (−50 dB), korta toningar i kanterna, normalisera toppen
    env = np.abs(a)
    th = max(env.max() * 0.004, 1e-4)
    on = np.where(env > th)[0]
    if len(on): a = a[max(0, on[0] - int(sr * 0.004)): on[-1] + int(sr * 0.02)]
    f = min(len(a) // 4, int(sr * 0.004))
    if f > 1:
        a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f)
    m = np.abs(a).max()
    if m > 0: a = a / m * peak
    return a

def encode(a, sr, kbps=64):
    with tempfile.TemporaryDirectory() as d:
        wp, mp = os.path.join(d, 'a.wav'), os.path.join(d, 'a.mp3')
        w = wave.open(wp, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wp, '-ar', '44100', '-ac', '1', '-b:a', f'{kbps}k', mp], check=True)
        return open(mp, 'rb').read()

out, total = {}, 0
for name, (rel, peak) in S.items():
    a, sr = load(os.path.join(SRC, rel))
    a = process(a, sr, peak)
    b = encode(a, sr)
    out[name] = base64.b64encode(b).decode()
    total += len(b)
if POTATO:
    d = tempfile.mkdtemp()
    wp = os.path.join(d, 'p.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', POTATO, '-ac', '1', '-ar', '44100', wp], check=True)
    a, sr = load(wp)
    b = encode(process(a, sr, 0.85), sr)
    out['hello'] = base64.b64encode(b).decode(); total += len(b)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, 'w'))
print(len(out), 'ljud,', total // 1024, 'kB mp3 →', OUT)
