from pathlib import Path

import requests


PROJECT_ROOT = Path(__file__).resolve().parents[2]

RAW_DIR = (
    PROJECT_ROOT
    / "python"
    / "transfer_value"
    / "data"
    / "raw"
)

BASE_URL = (
    "https://pub-e682421888d945d684bcae8890b0ec20"
    ".r2.dev/data"
)

FILES = [
    "players.csv.gz",
    "player_valuations.csv.gz",
    "transfers.csv.gz",
]


def download_file(filename):
    url = f"{BASE_URL}/{filename}"

    output_path = RAW_DIR / filename

    print(f"Downloading {filename}...")

    response = requests.get(
        url,
        timeout=120,
        stream=True,
    )

    response.raise_for_status()

    with open(output_path, "wb") as file:
        for chunk in response.iter_content(
            chunk_size=1024 * 1024
        ):
            if chunk:
                file.write(chunk)

    size_mb = (
        output_path.stat().st_size
        / 1024
        / 1024
    )

    print(
        f"Saved {filename} "
        f"({size_mb:.1f} MB)"
    )


if __name__ == "__main__":
    RAW_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    print(
        "Downloading Transfermarkt dataset..."
    )
    print()

    for filename in FILES:
        download_file(filename)

    print()
    print("Downloads complete!")