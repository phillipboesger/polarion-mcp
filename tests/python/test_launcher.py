"""Check MCP stdio preservation, pinned execution and startup diagnostics."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import subprocess

spec = importlib.util.spec_from_file_location(
    "launcher", Path(__file__).resolve().parents[2] / "python/polarion_alm_mcp/__init__.py")
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class LauncherTests(unittest.TestCase):
    def test_missing_runtime_does_not_start_server(self):
        with patch.object(launcher.shutil, 'which', return_value=None), patch.object(launcher.os, 'execv') as execute:
            self.assertEqual(launcher.main(), 1)
            execute.assert_not_called()

    def test_old_node_does_not_start_server(self):
        with patch.object(launcher.shutil, 'which', return_value='/bin/node'), patch.object(launcher.subprocess, 'check_output', return_value='v20.0.0'), patch.object(launcher.os, 'execv') as execute:
            self.assertEqual(launcher.main(), 1)
            execute.assert_not_called()

    def test_posix_replaces_process_and_inherits_stdio(self):
        with patch.object(launcher.sys, 'argv', ['polarion-alm-mcp', '--example']), patch.object(launcher.shutil, 'which', side_effect=['/bin/node', '/bin/npx']), patch.object(launcher.subprocess, 'check_output', return_value='v22.0.0'), patch.object(launcher.os, 'name', 'posix'), patch.object(launcher.os, 'execv', side_effect=SystemExit) as execute:
            with self.assertRaises(SystemExit):
                launcher.main()
            execute.assert_called_once_with('/bin/npx', ['/bin/npx', '--yes', 'polarion-mcp@' + launcher.__version__, '--example'])

    def test_failed_node_version_check(self):
        with patch.object(launcher.shutil, 'which', return_value='/bin/node'), patch.object(launcher.subprocess, 'check_output', side_effect=subprocess.CalledProcessError(1, 'node')):
            self.assertEqual(launcher.main(), 1)
