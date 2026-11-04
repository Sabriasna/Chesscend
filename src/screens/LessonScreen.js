import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Board from '../components/Board';
import { BackHeader, Card, Page, PillButton, T } from '../components/ui';
import { ALL_LESSONS } from '../data/lessons';
import { Position, squareIndex } from '../engine/chess';
import { C, F } from '../theme/ui';

export default function LessonScreen({ lessonId, nav }) {
  const { theme, markLesson, progress } = useApp();
  const { width } = useWindowDimensions();
  const index = ALL_LESSONS.findIndex((l) => l.id === lessonId);
  const lesson = ALL_LESSONS[index] ?? ALL_LESSONS[0];
  const next = ALL_LESSONS[index + 1];
  const pos = useMemo(() => new Position(lesson.fen), [lesson.fen]);
  const [selected, setSelected] = useState(lesson.focus ? squareIndex(lesson.focus) : null);

  // Show the moves of the selected piece, whatever its color.
  const targets = useMemo(() => {
    if (selected === null || !pos.board[selected]) return [];
    const saved = pos.turn;
    pos.turn = pos.board[selected].color;
    const t = pos.movesFrom(selected).map((m) => m.to);
    pos.turn = saved;
    return t;
  }, [selected, pos]);

  const checkSquare = pos.inCheck() ? pos.findKing(pos.turn) : null;
  const done = progress.lessonsDone.includes(lesson.id);
  const boardSize = Math.min(width - 36, 460);

  const finish = () => {
    markLesson(lesson.id);
    if (next && next.courseId === lesson.courseId) nav.go({ name: 'lesson', lessonId: next.id });
    else nav.go({ name: 'course', courseId: lesson.courseId });
  };

  return (
    <>
      <BackHeader title={`Lesson ${index + 1}`} onBack={() => nav.go({ name: 'course', courseId: lesson.courseId })} />
      <Page>
        <Text style={styles.title}>{lesson.title}</Text>
        <View style={{ alignItems: 'center', marginVertical: 14 }}>
          <Board
            board={pos.board}
            size={boardSize}
            theme={theme}
            orientation="w"
            selected={selected}
            targets={targets}
            lastMove={null}
            checkSquare={checkSquare}
            danger={[]}
            showCoordinates
            onSquarePress={(sq) => setSelected(pos.board[sq] && sq !== selected ? sq : null)}
          />
        </View>
        <Card>
          {lesson.paragraphs.map((p, i) => (
            <Text key={i} style={[T.body, i > 0 && { marginTop: 10 }]}>{p}</Text>
          ))}
        </Card>
        <View style={styles.tip}>
          <MaterialCommunityIcons name="gesture-tap" size={20} color={C.goldDeep} />
          <Text style={[T.small, { flex: 1, marginLeft: 8 }]}>Tap any piece on the board to see where it can go.</Text>
        </View>
        <PillButton
          label={done ? (next && next.courseId === lesson.courseId ? 'Next lesson' : 'Back to course') : 'Got it!'}
          icon={done ? 'arrow-right' : 'check'}
          onPress={finish}
          style={{ marginTop: 16 }}
        />
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: F.black, fontSize: 32, color: C.ink, marginTop: 4 },
  tip: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
});
