// Cursos, lecciones y problemas en español (el inglés está en src/data). Mismos identificadores.
export const CONTENT_ES = {
  courses: {
    basics: { title: 'Lo básico del ajedrez', description: 'Aprende cómo se mueve cada pieza y cómo ganar una partida.' },
    strategy: { title: 'Primeras estrategias', description: 'Reglas de oro sencillas para empezar bien cada partida.' },
  },
  lessons: {
    b1: {
      title: 'El tablero',
      paragraphs: [
        'Un tablero de ajedrez tiene 64 casillas, en 8 filas y 8 columnas. Colócalo siempre con una casilla clara en la esquina inferior derecha.',
        'Las columnas se nombran con letras (de la a a la h) y las filas con números (del 1 al 8). Cada casilla tiene un nombre, como e4.',
        'Las blancas siempre juegan primero. Después, cada jugador hace una jugada por turno.',
      ],
    },
    b2: {
      title: 'El peón',
      paragraphs: [
        'El peón avanza en línea recta, una casilla cada vez. En su primera jugada, puede avanzar dos casillas.',
        'El peón captura de otra forma: una casilla en diagonal hacia delante. Nunca retrocede.',
        'Toca el peón para ver sus jugadas. Verás que puede capturar el caballo negro.',
      ],
    },
    b3: {
      title: 'La torre',
      paragraphs: [
        'La torre se mueve en línea recta: arriba, abajo, a la izquierda o a la derecha, tantas casillas como quiera.',
        'No puede saltar por encima de otras piezas. Captura colocándose en la casilla de una pieza rival.',
        'Una torre vale unos 5 peones.',
      ],
    },
    b4: {
      title: 'El alfil',
      paragraphs: [
        'El alfil se mueve en diagonal, tantas casillas como quiera.',
        'Un alfil siempre se queda en casillas del mismo color. Cada bando empieza con un alfil de casillas claras y otro de casillas oscuras.',
        'Un alfil vale unos 3 peones.',
      ],
    },
    b5: {
      title: 'La dama',
      paragraphs: [
        'La dama es la pieza más poderosa. Se mueve como una torre y un alfil juntos: en cualquier línea recta o diagonal.',
        'Vale unos 9 peones. ¡Ten cuidado de no perderla pronto!',
      ],
    },
    b6: {
      title: 'El caballo',
      paragraphs: [
        'El caballo se mueve en forma de L: dos casillas en una dirección y luego una hacia un lado.',
        'Es la única pieza que puede saltar por encima de las demás.',
        'Un caballo vale unos 3 peones. A los caballos les encanta el centro del tablero.',
      ],
    },
    b7: {
      title: 'El rey',
      paragraphs: [
        'El rey se mueve una casilla en cualquier dirección.',
        'Es la pieza más importante: si tu rey queda atrapado, pierdes. El rey nunca puede ir a una casilla donde estaría atacado.',
      ],
    },
    b8: {
      title: 'Jaque y jaque mate',
      paragraphs: [
        'Cuando un rey está atacado, está en jaque. Hay que salir del jaque enseguida: mover el rey, bloquear el ataque o capturar la pieza que ataca.',
        'Si no hay ninguna salida, es jaque mate y la partida termina.',
        'Aquí, la torre blanca da jaque y el rey negro está atrapado por sus propios peones: ¡jaque mate!',
      ],
    },
    b9: {
      title: 'El enroque',
      paragraphs: [
        'El enroque es una jugada especial que pone a salvo a tu rey y saca una torre al juego. El rey se mueve dos casillas hacia una torre, y la torre salta al otro lado del rey.',
        'Solo puedes enrocar si ni el rey ni esa torre se han movido, las casillas entre ellos están vacías, y el rey no está en jaque ni pasa por una casilla atacada.',
        'Toca el rey blanco para ver los dos enroques posibles.',
      ],
    },
    b10: {
      title: 'La coronación y la captura al paso',
      paragraphs: [
        'Cuando un peón llega a la última fila, corona: se convierte en dama, torre, alfil o caballo. La mayoría de los jugadores elige una dama.',
        'Captura al paso: si un peón rival avanza dos casillas y queda justo al lado de tu peón, puedes capturarlo como si solo hubiera avanzado una. Solo se puede hacer en la jugada siguiente.',
        'Toca el peón blanco de e5: puede capturar al paso el peón de d5.',
      ],
    },
    b11: {
      title: 'Las tablas',
      paragraphs: [
        'No todas las partidas tienen un ganador. Si al jugador que le toca no tiene ninguna jugada legal pero no está en jaque, es ahogado: tablas.',
        'Aquí, las negras no tienen ninguna jugada pero no están en jaque. ¡Ten cuidado con esto cuando vayas ganando!',
        'Una partida también acaba en tablas cuando la misma posición aparece tres veces, o cuando ningún bando tiene piezas suficientes para dar mate.',
      ],
    },
    s1: {
      title: 'Controlar el centro',
      paragraphs: [
        'Las cuatro casillas centrales (d4, e4, d5, e5) son las más importantes del tablero. Las piezas en el centro controlan más casillas.',
        'Una gran primera jugada es avanzar dos casillas un peón central, como e4 o d4.',
      ],
    },
    s2: {
      title: 'Desarrollar las piezas',
      paragraphs: [
        'Saca pronto tus caballos y alfiles, hacia el centro. Una pieza que se queda en su casilla inicial no ayuda.',
        'Intenta no mover dos veces la misma pieza en la apertura, y no saques la dama demasiado pronto: pueden perseguirla fácilmente.',
        'Toca el caballo de f3 para ver cuántas casillas controla.',
      ],
    },
    s3: {
      title: 'Enrocar pronto',
      paragraphs: [
        'Un rey en el centro es fácil de atacar. Enrocar en las 10 primeras jugadas lo protege detrás de un muro de peones.',
        'Aquí, las blancas están listas para enrocar. ¡Toca el rey!',
      ],
    },
    s4: {
      title: 'No regalar piezas',
      paragraphs: [
        'Antes de cada jugada, pregúntate: ¿puede mi rival capturar algo gratis?',
        'Valor de las piezas: peón 1, caballo 3, alfil 3, torre 5, dama 9. Cambia solo cuando recibas igual o más valor a cambio.',
        'Consejo: activa la ayuda durante una partida. El entrenador te avisará cuando una de tus piezas quede sin defensa.',
      ],
    },
  },
  puzzles: {
    p1: { title: 'La última fila', hint: 'El rey negro está atrapado detrás de sus propios peones. ¿Qué pieza puede llegar a la 8.ª fila?' },
    p2: { title: 'El mate del pastor', hint: 'El peón de f7 solo está defendido por el rey, y tu alfil lo apunta.' },
    p3: { title: 'El mate del loco', hint: 'Juegas con negras. Las blancas han abierto la diagonal junto al rey. ¡Usa tu dama!' },
    p4: { title: 'El mate de la coz', hint: 'El rey no tiene ninguna casilla libre. Un jaque de caballo no se puede bloquear.' },
    p5: { title: 'La dama en la esquina', hint: 'Tu rey ya controla a7 y b7. Da un jaque que también controle b8.' },
    p6: { title: 'La escalera de torres', hint: 'Una torre ya vigila la 7.ª fila. La otra puede terminar el trabajo.' },
    p7: { title: 'Las negras contraatacan', hint: 'Juegas con negras. El rey blanco está atrapado detrás de sus peones.' },
    p8: { title: 'Dama y peón', hint: 'Busca un jaque de dama que también controle g7 y g8.' },
    p9: { title: 'Dos torres', hint: 'Tu rey vigila la 7.ª fila. Da jaque en la 8.ª fila.' },
    p10: { title: 'La dama en la última fila', hint: 'La misma idea que en el primer problema: el rey está atrapado detrás de sus peones. Tu dama puede llegar a la 8.ª fila.' },
  },
};
