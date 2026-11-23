// Cours, leçons et puzzles en français (l'anglais est dans src/data). Mêmes identifiants.
export const CONTENT_FR = {
  courses: {
    basics: { title: 'Les bases des échecs', description: 'Apprends comment se déplace chaque pièce et comment gagner une partie.' },
    strategy: { title: 'Premières stratégies', description: 'Des règles d’or simples pour bien commencer chaque partie.' },
  },
  lessons: {
    b1: {
      title: "L'échiquier",
      paragraphs: [
        "Un échiquier compte 64 cases, sur 8 rangées et 8 colonnes. Place-le toujours avec une case claire dans le coin en bas à droite.",
        "Les colonnes sont désignées par des lettres (de a à h) et les rangées par des chiffres (de 1 à 8). Chaque case a un nom, comme e4.",
        'Les Blancs jouent toujours en premier. Ensuite, chaque joueur joue un coup à tour de rôle.',
      ],
    },
    b2: {
      title: 'Le pion',
      paragraphs: [
        "Le pion avance tout droit, d'une case à la fois. Lors de son tout premier coup, il peut avancer de deux cases.",
        "Le pion prend différemment : d'une case en diagonale vers l'avant. Il ne recule jamais.",
        'Touche le pion pour voir ses coups. Tu remarqueras qu’il peut prendre le cavalier noir.',
      ],
    },
    b3: {
      title: 'La tour',
      paragraphs: [
        "La tour se déplace en ligne droite : vers le haut, le bas, la gauche ou la droite, aussi loin qu'elle veut.",
        "Elle ne peut pas sauter par-dessus d'autres pièces. Elle prend en se posant sur une pièce adverse.",
        'Une tour vaut environ 5 pions.',
      ],
    },
    b4: {
      title: 'Le fou',
      paragraphs: [
        "Le fou se déplace en diagonale, aussi loin qu'il veut.",
        'Un fou reste toujours sur la même couleur de case. Chaque camp commence avec un fou de cases claires et un fou de cases foncées.',
        'Un fou vaut environ 3 pions.',
      ],
    },
    b5: {
      title: 'La dame',
      paragraphs: [
        "La dame est la pièce la plus puissante. Elle se déplace comme une tour et un fou réunis : en ligne droite ou en diagonale, dans toutes les directions.",
        'Elle vaut environ 9 pions. Attention à ne pas la perdre trop tôt !',
      ],
    },
    b6: {
      title: 'Le cavalier',
      paragraphs: [
        "Le cavalier se déplace en L : deux cases dans une direction, puis une case sur le côté.",
        "C'est la seule pièce qui peut sauter par-dessus les autres.",
        'Un cavalier vaut environ 3 pions. Les cavaliers adorent le centre de l’échiquier.',
      ],
    },
    b7: {
      title: 'Le roi',
      paragraphs: [
        "Le roi se déplace d'une case dans n'importe quelle direction.",
        "C'est la pièce la plus importante : si ton roi est pris au piège, tu perds. Le roi ne peut jamais aller sur une case où il serait attaqué.",
      ],
    },
    b8: {
      title: 'Échec et échec et mat',
      paragraphs: [
        "Quand un roi est attaqué, il est en échec. Il faut sortir de l'échec tout de suite : déplacer le roi, bloquer l'attaque ou prendre la pièce qui attaque.",
        "S'il n'y a aucune solution, c'est échec et mat : la partie est terminée.",
        'Ici, la tour blanche fait échec et le roi noir est bloqué par ses propres pions : échec et mat !',
      ],
    },
    b9: {
      title: 'Le roque',
      paragraphs: [
        "Le roque est un coup spécial qui met ton roi à l'abri et fait entrer une tour dans le jeu. Le roi se déplace de deux cases vers une tour, et la tour saute de l'autre côté du roi.",
        "Tu ne peux roquer que si ni le roi ni cette tour n'ont bougé, si les cases entre eux sont vides, et si le roi n'est pas en échec et ne traverse pas une case attaquée.",
        'Touche le roi blanc pour voir les deux roques possibles.',
      ],
    },
    b10: {
      title: 'La promotion et la prise en passant',
      paragraphs: [
        "Quand un pion atteint la dernière rangée, il est promu : il se transforme en dame, tour, fou ou cavalier. La plupart des joueurs choisissent une dame.",
        "Prise en passant : si un pion adverse avance de deux cases et arrive juste à côté de ton pion, tu peux le prendre comme s'il n'avait avancé que d'une case. C'est possible uniquement au coup suivant.",
        'Touche le pion blanc en e5 : il peut prendre le pion d5 en passant.',
      ],
    },
    b11: {
      title: 'Les parties nulles',
      paragraphs: [
        "Toutes les parties n'ont pas de gagnant. Si le joueur qui doit jouer n'a aucun coup possible mais n'est pas en échec, c'est le pat : partie nulle.",
        "Ici, les Noirs n'ont aucun coup mais ne sont pas en échec. Fais attention à ça quand tu es en train de gagner !",
        'Une partie est aussi nulle quand la même position revient trois fois, ou quand aucun camp n’a assez de pièces pour faire mat.',
      ],
    },
    s1: {
      title: 'Contrôler le centre',
      paragraphs: [
        "Les quatre cases centrales (d4, e4, d5, e5) sont les plus importantes de l'échiquier. Au centre, les pièces contrôlent plus de cases.",
        'Un excellent premier coup consiste à avancer un pion central de deux cases, comme e4 ou d4.',
      ],
    },
    s2: {
      title: 'Développer ses pièces',
      paragraphs: [
        "Sors tes cavaliers et tes fous tôt, vers le centre. Une pièce restée à sa place de départ ne sert à rien.",
        "Évite de jouer deux fois la même pièce dans l'ouverture, et ne sors pas ta dame trop tôt : elle peut facilement être chassée.",
        'Touche le cavalier en f3 pour voir combien de cases il contrôle.',
      ],
    },
    s3: {
      title: 'Roquer tôt',
      paragraphs: [
        "Un roi au centre est facile à attaquer. Roquer dans les 10 premiers coups le met à l'abri derrière un mur de pions.",
        'Ici, les Blancs sont prêts à roquer. Touche le roi !',
      ],
    },
    s4: {
      title: 'Ne pas donner ses pièces',
      paragraphs: [
        'Avant chaque coup, demande-toi : mon adversaire peut-il prendre quelque chose gratuitement ?',
        "Valeur des pièces : pion 1, cavalier 3, fou 3, tour 5, dame 9. N'échange que si tu récupères une valeur égale ou supérieure.",
        "Conseil : active l'aide pendant une partie. Le coach te préviendra quand une de tes pièces n'est pas défendue.",
      ],
    },
  },
  puzzles: {
    p1: { title: 'La dernière rangée', hint: 'Le roi noir est bloqué derrière ses propres pions. Quelle pièce peut atteindre la 8e rangée ?' },
    p2: { title: 'Le coup du berger', hint: "Le pion f7 n'est défendu que par le roi, et ton fou le vise." },
    p3: { title: 'Le mat du lion', hint: 'Tu joues les Noirs. Les Blancs ont ouvert la diagonale à côté du roi. Utilise ta dame !' },
    p4: { title: 'Le mat étouffé', hint: "Le roi n'a aucune case libre. Un échec de cavalier ne peut pas être bloqué." },
    p5: { title: 'La dame dans le coin', hint: 'Ton roi contrôle déjà a7 et b7. Donne un échec qui contrôle aussi b8.' },
    p6: { title: "L'escalier des tours", hint: "Une tour garde déjà la 7e rangée. L'autre peut finir le travail." },
    p7: { title: 'Les Noirs contre-attaquent', hint: 'Tu joues les Noirs. Le roi blanc est bloqué derrière ses pions.' },
    p8: { title: 'Dame et pion', hint: 'Cherche un échec de la dame qui contrôle aussi g7 et g8.' },
    p9: { title: 'Les deux tours', hint: 'Ton roi garde la 7e rangée. Fais échec sur la 8e rangée.' },
    p10: { title: 'La dame sur la dernière rangée', hint: 'Même idée que le premier puzzle : le roi est bloqué derrière ses pions. Ta dame peut atteindre la 8e rangée.' },
  },
};
