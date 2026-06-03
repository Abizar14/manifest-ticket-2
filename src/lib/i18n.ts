"use client";

import { Locale } from "./settings";

type Dict = Record<string, string>;

const ID: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.flights": "Jadwal Penerbangan",
  "nav.scan": "Scan Boarding Pass",
  "nav.scanEvents": "Riwayat Scan",
  "nav.passengers": "Cari Penumpang",
  "nav.analytics": "Statistik",
  "nav.settings": "Pengaturan",
  "nav.section.operations": "Operasional",
  "nav.section.data": "Data",
  "nav.section.system": "Sistem",
  "common.logout": "Keluar",
  "common.search": "Cari",
  "common.save": "Simpan",
  "common.cancel": "Batal",
  "common.delete": "Hapus",
  "common.back": "Kembali",
  "common.today": "Hari ini",
  "common.tomorrow": "Besok",
  "common.all": "Semua",
  "common.loading": "Memuat…",
  "common.empty": "Tidak ada data",
  "common.print": "Print",
  "common.export": "Export",
  "settings.title": "Pengaturan",
  "settings.subtitle":
    "Atur preferensi pribadi dan kelola data lokal aplikasi.",
  "settings.tab.profile": "Profil",
  "settings.tab.preferences": "Preferensi",
  "settings.tab.data": "Data",
  "settings.profile.name": "Nama",
  "settings.profile.email": "Email",
  "settings.profile.role": "Peran",
  "settings.pref.sound": "Suara feedback scan",
  "settings.pref.haptic": "Getaran (mobile)",
  "settings.pref.locale": "Bahasa",
  "settings.data.export": "Export semua data (JSON)",
  "settings.data.archiveExport": "Export arsip scan",
  "settings.data.archivePurge": "Hapus arsip",
  "settings.data.reset": "Reset semua data",
  "settings.data.resetConfirm":
    "Yakin reset semua data? Flight, scan event, dan pengaturan akan dikembalikan ke seed awal.",
  "topbar.operational": "Operasional Bandara",
};

const EN: Dict = {
  "nav.dashboard": "Dashboard",
  "nav.flights": "Flights Schedule",
  "nav.scan": "Scan Boarding Pass",
  "nav.scanEvents": "Scan History",
  "nav.passengers": "Find Passenger",
  "nav.analytics": "Analytics",
  "nav.settings": "Settings",
  "nav.section.operations": "Operations",
  "nav.section.data": "Data",
  "nav.section.system": "System",
  "common.logout": "Logout",
  "common.search": "Search",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.back": "Back",
  "common.today": "Today",
  "common.tomorrow": "Tomorrow",
  "common.all": "All",
  "common.loading": "Loading…",
  "common.empty": "No data",
  "common.print": "Print",
  "common.export": "Export",
  "settings.title": "Settings",
  "settings.subtitle":
    "Manage personal preferences and local application data.",
  "settings.tab.profile": "Profile",
  "settings.tab.preferences": "Preferences",
  "settings.tab.data": "Data",
  "settings.profile.name": "Name",
  "settings.profile.email": "Email",
  "settings.profile.role": "Role",
  "settings.pref.sound": "Scan feedback sound",
  "settings.pref.haptic": "Haptic feedback (mobile)",
  "settings.pref.locale": "Language",
  "settings.data.export": "Export all data (JSON)",
  "settings.data.archiveExport": "Export scan archive",
  "settings.data.archivePurge": "Purge archive",
  "settings.data.reset": "Reset all data",
  "settings.data.resetConfirm":
    "Reset all data? Flights, scan events, and settings will return to initial seed.",
  "topbar.operational": "Airport Operations",
};

const DICTS: Record<Locale, Dict> = { id: ID, en: EN };

export function t(key: string, locale: Locale = "id"): string {
  return DICTS[locale][key] ?? DICTS.id[key] ?? key;
}
