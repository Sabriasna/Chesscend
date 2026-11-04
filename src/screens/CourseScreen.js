import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { BackHeader, Card, Hero, Page, ProgressBar, T } from '../components/ui';
import { COURSES } from '../data/lessons';
import { C, F } from '../theme/ui';

export default function CourseScreen({ courseId, nav }) {
  const { progress } = useApp();
  const course = COURSES.find((c) => c.id === courseId) ?? COURSES[0];
  const done = course.lessons.filter((l) => progress.lessonsDone.includes(l.id)).length;
  return (
    <>
      <BackHeader title={course.level} onBack={nav.back} />
      <Page>
        <Hero title={course.title} subtitle={course.description} pieces={['p']} size={90} />
        <View style={styles.inline}>
          <ProgressBar value={(done / course.lessons.length) * 100} style={{ flex: 1, marginRight: 10 }} />
          <Text style={styles.pct}>{done}/{course.lessons.length}</Text>
        </View>
        <Card style={{ paddingVertical: 4, marginTop: 16 }}>
          {course.lessons.map((l, i) => {
            const isDone = progress.lessonsDone.includes(l.id);
            return (
              <Text
                key={l.id}
                onPress={() => nav.go({ name: 'lesson', lessonId: l.id })}
                style={[styles.row, i < course.lessons.length - 1 && styles.border]}
              >
                <Text style={[styles.num, isDone && { color: C.success }]}>{isDone ? '✓' : i + 1}  </Text>
                <Text style={styles.title}>{l.title}</Text>
              </Text>
            );
          })}
        </Card>
        <Text style={[T.small, { textAlign: 'center', marginTop: 14 }]}>
          <Feather name="info" size={12} /> Tap any piece on the lesson boards to see its moves.
        </Text>
      </Page>
    </>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center' },
  pct: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  row: { paddingVertical: 15, paddingHorizontal: 4 },
  border: { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  num: { fontFamily: F.bold, fontSize: 16, color: C.goldDeep },
  title: { fontFamily: F.semibold, fontSize: 16, color: C.ink },
});
