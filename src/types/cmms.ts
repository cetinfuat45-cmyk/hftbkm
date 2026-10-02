export type Department = 'ELEKTRİK' | 'MEKANİK' | 'DIŞ SERVİS' | 'İŞ GÜVENLİĞİ' | string;

export interface Machine {
  id: string;
  machineId?: string;
  machineName: string;
  costCenter?: string;
  maliyetMerkezi?: string;
  code?: string;
  machineCode?: string;
  qrCode?: string;
  toplamMakineKodu?: string;
}

export interface MaintenanceTemplate {
  templateId: string;
  machineId: string;
  machineName?: string;
  task: string;
  region?: string;
  system?: Department; // Department
  part?: string;
  targetValue?: string;
  orderNo?: number;
  photoRequired?: boolean;
  active: boolean;
  referenceImageUrl?: string;
}

export interface MaintenanceRecord {
  recordId: string;
  templateId: string;
  machineId: string;
  machineName: string;
  operator: string;
  result: 'UYGUN' | 'RED';
  measuredValue?: string;
  description?: string;
  proofImageUrl?: string;
  weekKey: string;
  createdAt: string;
  task?: string;
  system?: Department;
  targetValue?: string;
  clientRequestId?: string;
}

export interface UserSession {
  operator?: string;
  name?: string;
  fullName?: string;
  role?: string;
  email?: string;
}

export interface DepartmentConfig {
  deger: string;
  ad: string;
  kod: string;
  renk: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const DEPARTMENTS: DepartmentConfig[] = [
  {
    deger: 'ELEKTRİK',
    ad: 'Elektrik',
    kod: 'elektrik',
    renk: '#FFFF66',
    bgClass: 'bg-[#FFFF66]',
    borderClass: 'border-yellow-400',
    textClass: 'text-slate-900',
  },
  {
    deger: 'MEKANİK',
    ad: 'Mekanik',
    kod: 'mekanik',
    renk: '#66FFFF',
    bgClass: 'bg-[#66FFFF]',
    borderClass: 'border-cyan-400',
    textClass: 'text-slate-900',
  },
  {
    deger: 'DIŞ SERVİS',
    ad: 'Dış Servis',
    kod: 'dis',
    renk: '#D6C1A6',
    bgClass: 'bg-[#D6C1A6]',
    borderClass: 'border-stone-400',
    textClass: 'text-slate-900',
  },
  {
    deger: 'İŞ GÜVENLİĞİ',
    ad: 'İş Güvenliği',
    kod: 'isg',
    renk: '#FF5B3A',
    bgClass: 'bg-[#FF5B3A]',
    borderClass: 'border-orange-600',
    textClass: 'text-white',
  },
];
