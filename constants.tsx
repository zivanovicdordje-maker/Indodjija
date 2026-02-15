
import { PackageConfig, PackageKey } from './types';

export const COLORS = {
  darkGreen: '#1f2e2a',
  deepGreen: '#243834',
  gold: '#c8a45d',
  goldLight: '#d4af6a',
  ivory: '#f5f5f0',
  white: '#ffffff',
  gray: '#b8b8b8'
};

export const DEPOSIT_AMOUNT = 40;

const NIGHT_SLOTS = ['20:00–02:00'];
const KIDS_SLOTS = ['11:00–14:00', '15:00–18:00'];
const TEEN_SLOTS_3H = ['20:00–23:00', '21:00–00:00', '22:00–01:00'];
const TEEN_SLOTS_4H = ['20:00–00:00', '21:00–01:00', '22:00–02:00'];

export const ALL_DAY_SLOTS = [...KIDS_SLOTS, ...NIGHT_SLOTS];

export const PACKAGES: Record<PackageKey, PackageConfig> = {
  kids: {
    name: 'Dečiji Rođendan',
    emoji: '🎈',
    duration: '3h',
    inclusions: 'Šanker, ozvučenje, prostor, parking',
    slots: KIDS_SLOTS,
    maxGuests: { open: 200, closed: 70 },
    calcPrice: (children: number, adults: number) => {
      const total = children + adults;
      let price = 120;
      if (total > 50) {
        price += Math.ceil((total - 50) / 10) * 30;
      }
      return price;
    }
  },
  teen: {
    name: 'Tinejdž Žurka',
    emoji: '🎉',
    duration: '3h / 4h',
    inclusions: 'Šanker, ozvučenje, prostor, parking',
    slots: [...TEEN_SLOTS_3H, ...TEEN_SLOTS_4H],
    maxGuests: { open: 200, closed: 70 },
    calcPrice: (guests: number, slot: string) => {
      const is4h = TEEN_SLOTS_4H.includes(slot);
      let price = is4h ? 180 : 150;
      if (guests > 50) {
        price += Math.ceil((guests - 50) / 20) * 50;
      }
      return price;
    }
  },
  eighteen: {
    name: 'Punoletstvo',
    emoji: '🎂',
    duration: '6h',
    inclusions: 'Prostor, šanker, ozvučenje, parking',
    slots: NIGHT_SLOTS,
    maxGuests: { open: 200, closed: 70 },
    calcPrice: (guests: number) => {
      let price = 250;
      if (guests > 50) {
        price += Math.ceil((guests - 50) / 20) * 50;
      }
      return price;
    }
  },
  adult: {
    name: 'Odrasla Žurka',
    emoji: '🥂',
    duration: '6h',
    inclusions: 'Sam prostor, ozvučenje, parking',
    slots: NIGHT_SLOTS,
    maxGuests: { open: 200, closed: 70 },
    calcPrice: (guests: number) => {
      let price = 200;
      if (guests > 50) {
        price += Math.ceil((guests - 50) / 20) * 50;
      }
      return price;
    }
  },
  baby: {
    name: 'Rođenje Deteta',
    emoji: '👶',
    duration: '6h',
    inclusions: 'Prostor, šanker, ozvučenje, parking',
    slots: NIGHT_SLOTS,
    maxGuests: { open: 200, closed: 70 },
    calcPrice: (guests: number) => {
      let price = 250;
      if (guests > 50) {
        price += Math.ceil((guests - 50) / 20) * 50;
      }
      return price;
    }
  },
  gender: {
    name: 'Gender Reveal',
    emoji: '💖',
    duration: '6h',
    inclusions: 'Prostor, šanker, ozvučenje, parking',
    slots: NIGHT_SLOTS,
    maxGuests: { open: 200, closed: 70 },
    calcPrice: (guests: number) => {
      let price = 250;
      if (guests > 50) {
        price += Math.ceil((guests - 50) / 20) * 50;
      }
      return price;
    }
  },
  slavlja: {
    name: 'Premium Slavlja',
    emoji: '🌹',
    duration: 'Po dogovoru',
    inclusions: 'Celo organizovanje prostora, sedeća mesta, stolovi, escajg, premium postavka',
    slots: NIGHT_SLOTS,
    maxGuests: { open: 120, closed: 70 },
    calcPrice: () => 0
  }
};
