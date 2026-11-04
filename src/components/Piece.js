import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// ︎ force l'affichage « texte » (sinon certains téléphones affichent un emoji).
const FILLED = {
    k: '♚︎', q: '♛︎', r: '♜︎', b: '♝︎', n: '♞︎', p: '♟︎',
};
const HOLLOW = {
    k: '♔︎', q: '♕︎', r: '♖︎', b: '♗︎', n: '♘︎', p: '♙︎',
};
/**
 * Une pièce = le symbole plein (couleur de la pièce) + le symbole creux par-dessus
 * (le contour). Résultat net et lisible sur toutes les couleurs d'échiquier.
 */
export default function Piece({ type, color, size, theme }) {
    const fontSize = size * 0.8;
    const base = { fontSize, lineHeight: size, width: size, height: size };
    const fill = color === 'w' ? theme.whitePiece : theme.blackPiece;
    const outline = color === 'w' ? theme.pieceOutline : 'rgba(255,255,255,0.32)';
    return (<View style={{ width: size, height: size }} pointerEvents="none">
      <Text style={[styles.glyph, base, styles.shadow, { color: fill }]} allowFontScaling={false}>
        {FILLED[type]}
      </Text>
      <Text style={[styles.glyph, base, { color: outline }]} allowFontScaling={false}>
        {HOLLOW[type]}
      </Text>
    </View>);
}
const styles = StyleSheet.create({
    glyph: {
        position: 'absolute',
        top: 0,
        left: 0,
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
    },
    shadow: {
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1.5 },
        textShadowRadius: 2,
    },
});
