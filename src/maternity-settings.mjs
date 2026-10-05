// Shared homepage settings contract. Keep the frontend and admin copies aligned.
export const MATERNITY_SECTIONS = {
  pregnancy: {
    title: 'Celebrate Pregnancy',
    defaults: {
      eyebrow: 'Kinder Kochi · Celebrate Pregnancy',
      title: 'Every step of pregnancy, celebrated.',
      description: 'A community of mothers-to-be, joyful celebrations and support through your pregnancy journey. Discover Tharattazhaku, WOW MOM and Water Birth at Kinder Kochi.',
      imageUrl: '', imageAlt: 'Celebrate Pregnancy at Kinder Kochi',
      buttonLabel: 'Explore Celebrate Pregnancy',
      contactLabel: 'Talk to our maternity team', contactPhone: '',
      showOnGroup: true, showOnKochi: true,
    },
  },
  birthing: {
    title: 'Premium Birthing Centre',
    defaults: {
      eyebrow: 'Kinder Kochi · Premium Birthing Centre',
      title: 'A space for your joyful beginning.',
      description: '', imageUrl: '', imageAlt: 'Premium Birthing Centre at Kinder Kochi',
      highlights: 'LDRP suites\nBirth-companion support\nAntenatal learning\nPersonalised maternity care',
      buttonLabel: 'Discover the Birthing Centre',
      contactLabel: 'Enquire about birthing care', contactPhone: '7306701372',
      showOnGroup: true, showOnKochi: true,
    },
  },
};
export const maternityKey = (section, field) => `maternity${section[0].toUpperCase()}${section.slice(1)}${field[0].toUpperCase()}${field.slice(1)}`;
export function maternitySettings(settings = {}, section) {
  return Object.fromEntries(Object.entries(MATERNITY_SECTIONS[section].defaults).map(([field, fallback]) => [field, settings[maternityKey(section, field)] ?? fallback]));
}
