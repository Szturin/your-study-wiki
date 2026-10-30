"""Check the optimized Momo export and high-risk transform identities."""

import json
import re
from pathlib import Path

import numpy as np
import openpyxl

FOLDER = Path("S:/0_Obsidian/my_study_library/考研/1-843信号与系统/附件/墨墨记忆卡")
STEM = "中科大843信号与系统_真题校订与方法补强版_20261027"
ROOT = Path(__file__).resolve().parents[1]


def check_exports():
    planned = json.loads((FOLDER / f"{STEM}.json").read_text(encoding="utf-8"))
    book = openpyxl.load_workbook(FOLDER / f"{STEM}.xlsx", read_only=True, data_only=True)
    assert [list(row) for row in book.active.values] == planned
    markdown = (FOLDER / f"{STEM}_一键导入.md").read_text(encoding="utf-8")
    assert len(re.findall(r"^---$", markdown, re.M)) == len(planned) - 1
    assert len(re.findall(r"^===$", markdown, re.M)) == len(planned) - 1
    assert len(re.findall(r"^###(?!#)", markdown, re.M)) == len({row[1] for row in planned[1:]})
    imported = json.loads((ROOT / "src/lib/ustc843-formulas.json").read_text(encoding="utf-8"))
    assert len(imported["cards"]) == len(planned) - 1 == 217
    assert all(card["id"] for card in imported["cards"])
    assert len({card["id"] for card in imported["cards"]}) == 217

    original = openpyxl.load_workbook(FOLDER / "中科大843信号与系统_总体编辑版_20260729_六性判别补强.xlsx", read_only=True, data_only=True)
    old = list(original.active.values)[1:]
    old_ids = {card_id for card_id, _, _ in old if card_id}
    new_ids = {card_id for card_id, _, _ in planned[1:] if card_id}
    assert old_ids == new_ids
    print("PASS: 217 cards, 11 chapters, synchronized Markdown/Excel/website, original IDs retained")


def check_identities():
    rng = np.random.default_rng(843)
    m, l = 3, 4
    n = m * l
    x = rng.normal(size=n) + 1j * rng.normal(size=n)
    result = np.zeros(n, dtype=complex)
    for k1 in range(m):
        for k2 in range(l):
            result[k1 + m * k2] = sum(
                np.exp(-2j * np.pi * n2 * k1 / n)
                * sum(x[l * n1 + n2] * np.exp(-2j * np.pi * n1 * k1 / m) for n1 in range(m))
                * np.exp(-2j * np.pi * n2 * k2 / l)
                for n2 in range(l)
            )
    np.testing.assert_allclose(result, np.fft.fft(x), atol=1e-12)

    size = 7
    real = rng.normal(size=2 * size)
    y = np.fft.fft(real[::2] + 1j * real[1::2])
    even = (y + np.conj(y[(-np.arange(size)) % size])) / 2
    odd = (y - np.conj(y[(-np.arange(size)) % size])) / (2j)
    k = np.arange(2 * size)
    x_result = even[k % size] + np.exp(-2j * np.pi * k / (2 * size)) * odd[k % size]
    np.testing.assert_allclose(x_result, np.fft.fft(real), atol=1e-12)

    omega = np.linspace(0.05, 2.8, 4000)
    z = np.exp(1j * omega)
    h = 1 + 0.3 / z
    analytic = -np.real((-0.3 / z) / h)
    numeric = -np.gradient(np.unwrap(np.angle(h)), omega)
    np.testing.assert_allclose(analytic[5:-5], numeric[5:-5], atol=2e-7)

    taps = rng.normal(size=5)
    hk = np.fft.fft(taps)
    z = 1.2 * np.exp(0.3j)
    freq_sampling = (1 - z ** -5) / 5 * sum(
        hk[j] / (1 - np.exp(2j * np.pi * j / 5) / z) for j in range(5)
    )
    direct = sum(taps[j] / z ** j for j in range(5))
    np.testing.assert_allclose(freq_sampling, direct, atol=1e-12)
    print("PASS: composite FFT, real-sequence FFT, group delay, frequency-sampling H(z)")


if __name__ == "__main__":
    check_exports()
    check_identities()
