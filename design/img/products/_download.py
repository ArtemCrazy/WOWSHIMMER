"""Download variation photos from Drive and build palette JSON."""
import os
import json
import glob
import urllib.request
import urllib.error
from PIL import Image

BASE = r"C:\Users\user\Documents\Projects\WOWSHIMMER\design\img\products"

# Manifest: slug -> list of (file_id, original_title), capped at 20.
MANIFEST = {
    "studs-4mm": [
        ("1RRw13LdwuUo3tkj3UgQgGYokF3WGnpMq", "IMG_5119.JPG"),
        ("1vPPr1FuPuszCdKmjil74lpt4lYlWQAqg", "IMG_5129.JPG"),
        ("1SOzbk1PjjKsAZ3mwj2zSmVuZ_APRo0Q7", "IMG_5139 2.JPG"),
        ("16mRfaa7pTT9tenpdedwHd6Us67s3_63E", "IMG_5145.JPG"),
        ("1pZNxDyDWl2iQVwB4eo1kN2F5ZqbTDyKy", "IMG_5148.JPG"),
        ("1ICB9KOe1upSmsyZr-z9VbkNxz5ZcGhLB", "IMG_5128 2.JPG"),
        ("1yDqC4vzu49y3OpGaFsJ08tjE6Q4Swr0i", "IMG_5133.JPG"),
        ("1WaLiPfH_buQjk3KzYqjuU0vsPJNGR_y0", "IMG_5122 2.JPG"),
        ("10K4jFpTwb1h6qGU1I008uF-oUViHzwi1", "IMG_5143.JPG"),
        ("1ux2olM49IoP4yjLgY6syiJqKPbHE9zyG", "IMG_5142.JPG"),
        ("1gtQ_sz11D-qhyFIN5g69OtUfSQHJogn0", "IMG_5126.JPG"),
        ("1k6-imZWdGoj0Sb1pPmYQK7-LLnDMFYb-", "IMG_5131.JPG"),
        ("15JG92wPxrRJ2VNuxD01-GLAJZcN0ECfp", "IMG_5134 2.JPG"),
        ("1AsHyRE0Rtd8n9k-zM6Hu3F0gaMt5j-h7", "IMG_5120.JPG"),
        ("18sH6H9mLKPspdhe1Vvxugv-ISkHAuAS7", "IMG_5144.JPG"),
        ("1b5R8FR4FQ-klBwdU67zZyEJ7Pngle2-_", "IMG_5127 2.JPG"),
        ("13q7SfVAxACLFPjlJgok4F1LlTFEWiOnA", "IMG_5136 2.JPG"),
        ("1xZL1VDEU2dgsRRf2fFj9dXaAj57alX44", "IMG_5124.JPG"),
        ("1QlGYQrDQn1zO3CQ65GupK_pZq2dnKkVs", "IMG_5121.JPG"),
        ("1VtiQEQZeoJIfFQoBV7VFxd-xm3Pc3Uhn", "IMG_5135.JPG"),
    ],
    "studs-6mm": [
        ("1DfM1CS7_zmEheVnd0My5-TKWubtCX5o5", "IMG_5163.JPG"),
        ("1gCrn927D4HU-k7llbHelOPRpEPq8Z0-k", "IMG_5168.JPG"),
        ("1Ua4Dvw_5uxAmKj__5SxLMHOLfHuZ9BGO", "IMG_5169.JPG"),
        ("1mYPtbNef_3ITG01xurbT1CJtfS1E6IF5", "IMG_5160.JPG"),
        ("1Kd9QVBbuNHaJWyWUbGMoOl6tjallYN1h", "IMG_5170.JPG"),
        ("1aL229BZnneIaSB0sK-wfvPCUgEBLVDIx", "IMG_5155.JPG"),
        ("1h7dh50Azcic7xcIJDM5ZYjDBpw9sw1w5", "IMG_5175.JPG"),
        ("1wkwSey6eHiHjCiLt-rFDf31D1JLknbJH", "IMG_5173.JPG"),
        ("1-NVp-PIFNwrosxDsWcDybSSRReHLE6p5", "IMG_5161.JPG"),
        ("1XsoQHxrBJ8FZ7xESyShbLBTGdUAxlqSp", "IMG_5162.JPG"),
        ("1VU_3EzjI28DwkcZzVg2_y4UngLo61kap", "IMG_5177.JPG"),
        ("1bJpocpodzVNxegGVDZ-TJDQrdcSuDNFS", "IMG_5172.JPG"),
        ("13rULwouPOrUrbeTCdKuo4xZ3KRNgVIFR", "IMG_5166.JPG"),
        ("1Hzbb0paKlJk7yxCol3Ty1l5I9MieX_Rl", "IMG_5176.JPG"),
        ("1t7SItVEZmQD-9CpnYlr3dibTKdTn2_Tr", "IMG_5165.JPG"),
        ("1pUc21lxzOJGWbd-1fSHIzyyFGiIMjfXt", "IMG_5158 2.JPG"),
        ("19qAq3orkoO39sY-7UjweNMnueaghsfXc", "IMG_5151.JPG"),
        ("1N9FX0458yQNc4liOMWh5LPRTgQmcri-X", "IMG_5178.JPG"),
        ("1gd42yUqTsgI2uza_4t4Na6B3kJoIlK-r", "IMG_5153.JPG"),
        ("1lvBMUqLghvwDrf2d7lFi2n5taYUsrDoU", "IMG_5150.JPG"),
    ],
    "studs-8mm": [
        ("1dqjcxPZ0MgzvogFsLqYJZIhTkEt-ydht", "IMG_5199.JPG"),
        ("1PjN_MbX00KXe5lcHndujwRPgFGKDdkbF", "IMG_5192.JPG"),
        ("1g9AQvrjwd3tNSIN-Pw7dmsCAbpv37Yaz", "IMG_5206.JPG"),
        ("1MZ8ufHlx2KB_-sE1te_2ktiod6GZ94-O", "IMG_5184.JPG"),
        ("11Awjs2whIhhCmtuaDmOzjMbj_3PhfgUb", "IMG_5191.JPG"),
        ("1wkmYVqKMCfpYRr5hSNgvQrPUkudE_M1t", "IMG_5208.JPG"),
        ("18IrL8MbWUPtbFfYgSAOOg2s_id__2DTc", "IMG_5195.JPG"),
        ("1uxTIuimvKo6TZW5MB83-8SuUexLcAGps", "IMG_5193.JPG"),
        ("1CZCMvzXRiBYERynZ45vTwcnwpl_dvc59", "IMG_5210.JPG"),
        ("14gjwdd08ETYyTXG7niZU-ReaFOVBMduX", "IMG_5190.JPG"),
        ("1aB0J7qXo5B0qllYmF8zRpKz4YYgSUK0p", "IMG_5187.JPG"),
        ("1EnCqYBWkApYPzHAuv5I8olex05kRa3HD", "IMG_5196.JPG"),
        ("15JYPL-rWfnUlMN9vMsueVW1TCjKV06Cs", "IMG_5194.JPG"),
        ("1gnAI1XV4yX4sQtVs2YeSqDBkhv3YlkMq", "IMG_5186.JPG"),
        ("1jBbJx4cqOfbJXCMSCPaii09XOp7jTEt_", "IMG_5197.JPG"),
        ("18u9LdkxtCdP1Eme976l0F7jEmApjLfq2", "IMG_5207.JPG"),
        ("1iu9QZ8WvSO2o2CkVLZuvAoEPfWSPFRcD", "IMG_5183.JPG"),
        ("1MPbiB79YaeiGKzi3Ma87Qim0O5dSwcY5", "IMG_5202.JPG"),
        ("1LFahA085obNiBF2ANpHr4Z-_NP2FMmbt", "IMG_5209.JPG"),
        ("1HzsLViAbOgxyETIknBj-d_6mo9t-nAnW", "IMG_5205.JPG"),
    ],
    "pendant-thread": [
        ("1PjrpFQm3w3dXYrCx6s-YAtpO5nOCsZ37", "IMG_5073.JPG"),
        ("1z1TSZvmPrKqRIVtm2NxewyirAZmbc_Tp", "IMG_5068.JPG"),
        ("1omJGJDIeDeEsxZOoHEJHojQJYmusm06u", "IMG_5050.JPG"),
        ("147Db8WXZgwaQ-LSOrWIeUl7YE6HQgSoC", "IMG_5056.JPG"),
        ("1jNsFlzNAVVOoKptdI2VhTpCUI2dKgqGP", "IMG_5061.JPG"),
        ("14JKfYoPTlyIrSzt9Gg5sbII3lgJeA81x", "IMG_5064.JPG"),
        ("12YDhJ_NO7mSzTCw9-isfx4jYKaivI9Lb", "IMG_5053.JPG"),
        ("1xKV9MAOeafxx7qTV01V1zdTManI0Fh9U", "IMG_5074.JPG"),
        ("1opQOWPzhSZRMi4eQsmI9Hix0yUqzA-BS", "IMG_5049.JPG"),
        ("1rYEAac4o9H0vfxS0Sxz-2j4VGLeIlJwQ", "IMG_5057.JPG"),
        ("17s91kkb_XsPPMZ4hhlmDKRYRXNa8tD10", "IMG_5062.JPG"),
        ("1zSfIRGIVIOU1cDCwYePzbLlgqnmHt95U", "IMG_5059.JPG"),
        ("1UC3f00hOBYdyeCRGYnj9lrSmJ4bg9b2s", "IMG_5058.JPG"),
        ("1bn1ao78w8858oX9uDP2QUoS_MOTpTi_H", "IMG_5075.JPG"),
        ("1noM1FlioTVacNsDDDpqL9buV7hnoQXDr", "IMG_5069.JPG"),
        ("1NJsBRj48PT-SIpyjEVmS6ZfmqB2ydSEu", "IMG_5052.JPG"),
        ("1Pd0H482K9iKhAbv74t-JhIszNVFDVqTn", "IMG_5063.JPG"),
        ("1oYwgR2aF4qakLGKzU7llRIcCJtarVKtD", "IMG_5065.JPG"),
        ("15zjJbOuceBZRtbTeeLOsyDNJNkzlESBo", "IMG_5071.JPG"),
        ("1PYKA8DP-1vTUdsBOPH9JWcIOuNKrtpes", "IMG_5072.JPG"),
    ],
    "bar": [
        ("1RUHUfmYted2GNHuLZwBnR-_lw9_XiDzc", "IMG_5084.JPG"),
        ("1ZJQbGM-XUgZsWwU11CvJd5SBGkmuQXD-", "IMG_5081.JPG"),
        ("1BneM_HpaI2Wu4Km1zVFSWGVavx9NfpD7", "IMG_5098.JPG"),
        ("1LsZBOrekThY_nKm2QdNgDom2rwLl-1Bf", "IMG_5102.JPG"),
        ("1RtAAwjnLCzny5lxxWB-NeoEZlGv78SAC", "IMG_5089.JPG"),
        ("1MG9_g2TUpDJN6t0VWcg7pMbG1Kd44tcS", "IMG_5077.JPG"),
        ("1khxay2f4Fhkr9qDK4GY9WWRIDxTgaqS8", "IMG_5083.JPG"),
        ("1nsYu9fZMMEgA3NhkYdjKl8NXTKHCndTX", "IMG_5100.JPG"),
        ("1zvnVvbldrW-Waa6Tw66BCaemzKCe-zcp", "IMG_5099.JPG"),
        ("1A3rEoNtS-wNL2P-wSFng76B7fUQy9Hn2", "IMG_5078.JPG"),
        ("1xFh05WcSg5Nx15Fx5g-E6voFazZEkTX0", "IMG_5094.JPG"),
        ("1GPSZ6o6yrrxKlZdx1nVtEGNe33lpRK2s", "IMG_5092.JPG"),
        ("1VAmDxGnfk6-fjzdVCo7Q5kG9_HBXxrN1", "IMG_5095.JPG"),
        ("1YYDgGArwixAoAmtwKXPVUfIwsP5fY_kt", "IMG_5091.JPG"),
        ("1sb5nJnzQLXhCsPF9Tl015FmTtdr1rEZA", "IMG_5080.JPG"),
        ("1SCGB52VA4jYno6lYb--7bGxp1X998Jea", "IMG_5096.JPG"),
        ("1BtY982PBfU8jNVjVRaKUC-SmmA7pjb2C", "IMG_5086.JPG"),
        ("1U6p1tozNQU508DEERC2vloE0FLB5JbFG", "IMG_5090.JPG"),
        ("15vIolprB24tTp5XOUaxrtJW9E-C-aTvf", "IMG_5097.JPG"),
        ("1ZpiaPVZXKld6IPRl7BdRaJ_6rribw0eZ", "IMG_5105.JPG"),
    ],
    "ear-threader": [],
    "pendant-chain": [],
    "ring": [],
}


def download(file_id: str, dest: str) -> bool:
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        # Drive may return an HTML interstitial for big files; for small product
        # images (<100KB) the direct uc URL returns the bytes immediately.
        if data[:6] in (b"<!DOCT", b"<html>", b"<HTML>"):
            return False
        with open(dest, "wb") as f:
            f.write(data)
        return True
    except urllib.error.URLError as e:
        print(f"  download error for {file_id}: {e}")
        return False


def crystal_color(path: str) -> str:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    cx0, cy0 = int(w * 0.35), int(h * 0.35)
    cx1, cy1 = int(w * 0.65), int(h * 0.65)
    crop = img.crop((cx0, cy0, cx1, cy1))
    pixels = list(crop.getdata())
    r = sum(p[0] for p in pixels) // len(pixels)
    g = sum(p[1] for p in pixels) // len(pixels)
    b = sum(p[2] for p in pixels) // len(pixels)
    return f"#{r:02x}{g:02x}{b:02x}"


def main():
    download_counts = {}
    for slug, files in MANIFEST.items():
        slug_dir = os.path.join(BASE, slug)
        os.makedirs(slug_dir, exist_ok=True)
        ok = 0
        for i, (fid, title) in enumerate(files, start=1):
            dest = os.path.join(slug_dir, f"v{i:02d}.jpg")
            if os.path.exists(dest) and os.path.getsize(dest) > 1024:
                ok += 1
                continue
            if download(fid, dest):
                ok += 1
            else:
                print(f"  FAILED {slug}/v{i:02d} ({title})")
        download_counts[slug] = ok
        print(f"{slug}: {ok}/{len(files)} downloaded")

    # Build palette
    out = {}
    total_bytes = 0
    for slug in MANIFEST:
        slug_dir = os.path.join(BASE, slug)
        files = sorted(glob.glob(os.path.join(slug_dir, "v*.jpg")))
        entries = []
        for f in files:
            try:
                color = crystal_color(f)
                total_bytes += os.path.getsize(f)
                entries.append({"file": os.path.basename(f), "color": color})
            except Exception as e:
                print(f"  color error {f}: {e}")
        out[slug] = entries

    with open(os.path.join(BASE, "_palette.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print("\n=== SUMMARY ===")
    for slug, entries in out.items():
        sample = [e["color"] for e in entries[:5]]
        print(f"{slug}: {len(entries)} variants  sample={sample}")
    print(f"\nTotal disk usage: {total_bytes/1024:.1f} KB ({total_bytes/1024/1024:.2f} MB)")


if __name__ == "__main__":
    main()
