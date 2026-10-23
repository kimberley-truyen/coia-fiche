/* Coïa — Données statiques (chargées avant script.js) */
const NATURES = {
  prudent: { label: 'Prudent', min: 7, max: 13, budget: 15, gameMax: 16 },
  neutre:  { label: 'Neutre',  min: 5, max: 15, budget: 25, gameMax: 17 },
  greedy:  { label: 'Greedy',  min: 3, max: 17, budget: 35, gameMax: 18 }
};
const CARACS = ['fo', 'ag', 'pe', 'sa', 'so'];
const FUNDS = ['pv', 'maneuvers', 'dodge', 'mana', 'adapt'];

// Bonus de toucher (clé = Agilité) et de dégâts (clé = Force)
const DICO_AGI_FOR = {
  neutre: { 5: 0, 6: 0, 7: 0, 8: 0, 9: 1, 10: 1, 11: 1, 12: 1, 13: 2, 14: 2, 15: 2, 16: 3, 17: 3 },
  prudent: { 7: 0, 8: 0, 9: 1, 10: 1, 11: 1, 12: 1, 13: 2, 14: 2, 15: 2, 16: 3 },
  greedy: { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 2, 14: 2, 15: 2, 16: 2, 17: 3, 18: 3 }
};
// Esquive (clé = Perception)
const DICO_ESQ = {
  neutre: { 5: 15, 6: 14, 7: 13, 8: 12, 9: 11, 10: 10, 11: 9, 12: 8, 13: 8, 14: 7, 15: 7, 16: 6, 17: 5 },
  prudent: { 7: 14, 8: 13, 9: 12, 10: 11, 11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5 },
  greedy: { 3: 15, 4: 14, 5: 13, 6: 12, 7: 11, 8: 11, 9: 10, 10: 10, 11: 10, 12: 9, 13: 8, 14: 7, 15: 7, 16: 6, 17: 6, 18: 5 }
};

// Libellés
const CARAC_NAMES = { fo: 'Force', ag: 'Agilité', pe: 'Perception', sa: 'Savoir', so: 'Social' };
const FUND_LABELS = { pv: 'PV', maneuvers: 'Manœuvres', dodge: 'Esquive', mana: 'Mana', adapt: 'Adaptabilité' };
const INCANT = ['fo', 'ag', 'pe', 'so'];  // caractéristiques d'incantation possibles (jamais Savoir)
const PHASE2_BASE = 9;                    // points de base de la phase 2

// Sous-compétences : moyenne de deux caractéristiques ; plusieurs paires = choix du joueur
const SUBSKILLS = [
  { id: 'athletisme', name: 'Athlétisme', pairs: [['fo', 'ag']] },
  { id: 'tromperie', name: 'Tromperie', pairs: [['so', 'sa']] },
  { id: 'discretion', name: 'Discrétion', pairs: [['ag', 'pe']] },
  { id: 'nature', name: 'Nature', pairs: [['sa', 'pe']] },
  { id: 'escamotage', name: 'Escamotage', pairs: [['ag', 'sa'], ['ag', 'so'], ['ag', 'pe']] },
  { id: 'fouiller', name: 'Fouiller', pairs: [['pe', 'so']] },
  { id: 'intimidation', name: 'Intimidation', pairs: [['so', 'fo'], ['so', 'sa']] },
  { id: 'perspicacite', name: 'Perspicacité', pairs: [['so', 'pe']] },
  { id: 'medecine', name: 'Médecine', pairs: [['sa', 'ag']] }
];


// Cards : types, champs éventuels (ajoutés seulement si le joueur en a besoin)
const CARD_TYPES = { mentale: 'Magie mentale', physique: 'Magie physique', manoeuvre: 'Manœuvre' };
const CARD_OPTIONAL = {
  perTurn: { label: 'Coût par tour', num: true }, area: { label: "Zone d'effet" }, duration: { label: 'Durée (tours)', num: true },
  damage: { label: 'Dégâts' }, effect: { label: 'Effet additionnel' }, damage2: { label: 'Dégâts additionnels' }
};
// Style de la fiche
const THEMES = [{ id: 'parchemin', label: 'Parchemin' }, { id: 'nuit', label: 'Nuit' }, { id: 'foret', label: 'Forêt' }, { id: 'ocean', label: 'Océan' }, { id: 'rubis', label: 'Rubis' }, { id: 'nature', label: 'Nature' }];
const FONTS = [{ id: 'classique', label: 'Classique' }, { id: 'moderne', label: 'Moderne' }, { id: 'palatino', label: 'Élégante (Palatino)' }, { id: 'trebuchet', label: 'Humaniste (Trebuchet)' }, { id: 'verdana', label: 'Lisible (Verdana)' }, { id: 'manuscrit', label: 'Manuscrit (titres)' }, { id: 'machine', label: 'Machine à écrire' }];

// Dé de dégâts bonus par classe de toucher (C5 : aucun)
const TOUCH_DICE = ['1d12', '1d8', '1d6', '1d4', null];
const COINS = { go: "Gros d'or (go)", po: "Pièces d'or (po)", pa: "Pièces d'argent (pa)" };

// Sauvegarde : au-delà de ce délai sans export, des modifications non exportées déclenchent le bandeau d'avertissement
const EXPORT_REMINDER_H = 24;
