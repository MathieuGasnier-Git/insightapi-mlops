from pathlib import Path

from train import get_dvc_data_version


def test_get_dvc_data_version_reads_md5_from_dvc_file(tmp_path: Path) -> None:
    dvc_file = tmp_path / "iris.csv.dvc"
    dvc_file.write_text(
        "outs:\n"
        "- md5: abc123\n"
        "  size: 4551\n"
        "  path: iris.csv\n"
    )

    assert get_dvc_data_version(dvc_file) == "abc123"
