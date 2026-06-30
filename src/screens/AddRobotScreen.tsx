import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  StyleSheet, ScrollView, ActivityIndicator, Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { Colors } from '@/lib/colors';
import client from '@/api/client';
import { hardwareClassApi, HardwareClass } from '@/api/hardwareClass';

type Props = NativeStackScreenProps<RootStackParamList, 'AddRobot'>;

interface CreatedRobot {
  hardwareName: string;
  sequenceId: number | string;
  apiKey: string;
  id: string;
  roomId: string;
}

// ── Success Modal ────────────────────────────────────────────────────────────
function SuccessModal({ visible, data, onDone }: {
  visible: boolean;
  data: CreatedRobot | null;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, field: string) => {
    try { await Share.share({ message: text }); } catch { /* cancelled */ }
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const download = async () => {
    if (!data) return;
    const text = [
      `Robot Name: ${data.hardwareName}`,
      `Robot ID: ${data.id}`,
      `Sequence ID: ${data.sequenceId}`,
      `Secret Key: ${data.apiKey}`,
      `WebRTC Room ID: ${data.roomId}`,
      '',
      'Instructions:',
      '- Use the Robot ID and Secret Key for API authentication',
      '- Use the WebRTC Room ID for video streaming and teleop control',
    ].join('\n');

    try {
      await Share.share({ message: text, title: `${data.hardwareName}-credentials` });
    } catch { /* user cancelled */ }
  };

  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={ss.overlay}>
        <View style={ss.card}>
          {/* Title */}
          <Text style={ss.title}>Robot Created Successfully</Text>
          <Text style={ss.subtitle}>
            Copy or save the credentials now — the secret key won't be shown again.
          </Text>

          {/* Credentials box */}
          <View style={ss.credBox}>
            {/* Robot name + sequence */}
            <View style={ss.credRow}>
              <View style={ss.robotIcon}>
                <Text style={ss.robotIconText}>{data.hardwareName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={ss.credName}>{data.hardwareName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={ss.credSub}>{data.sequenceId}</Text>
                  <CopyBtn
                    copied={copied === 'sequenceId'}
                    onPress={() => copy(String(data.sequenceId), 'sequenceId')}
                  />
                </View>
              </View>
            </View>

            <View style={ss.divider} />

            {/* API Key */}
            <CredField
              label="Secret Key (API Key)"
              value={data.apiKey}
              field="apiKey"
              copied={copied}
              onCopy={copy}
            />

            <View style={ss.divider} />

            {/* Room ID */}
            <CredField
              label="WebRTC Room ID"
              value={String(data.roomId)}
              field="roomId"
              copied={copied}
              onCopy={copy}
            />
          </View>

          {/* Buttons */}
          <View style={ss.btns}>
            <TouchableOpacity style={ss.doneBtn} onPress={onDone} activeOpacity={0.85}>
              <Text style={ss.doneBtnText}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ss.dlBtn} onPress={download} activeOpacity={0.85}>
              <Text style={ss.dlBtnText}>⬇</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CredField({ label, value, field, copied, onCopy }: {
  label: string; value: string; field: string;
  copied: string | null; onCopy: (v: string, f: string) => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={ss.credLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={ss.credValue} selectable>{value}</Text>
        <CopyBtn copied={copied === field} onPress={() => onCopy(value, field)} />
      </View>
    </View>
  );
}

function CopyBtn({ copied, onPress }: { copied: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={ss.copyBtn} activeOpacity={0.7}>
      <Text style={[ss.copyIcon, copied && { color: Colors.primary }]}>
        {copied ? '✓' : '⎘'}
      </Text>
    </TouchableOpacity>
  );
}

// ── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={fs.group}>
      <Text style={fs.label}>{label}</Text>
      {children}
      {error ? <Text style={fs.error}>{error}</Text> : null}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function AddRobotScreen({ navigation }: Props) {
  // Form state
  const [hardwareName, setHardwareName] = useState('');
  const [hardwareClass, setHardwareClass] = useState(''); // UUID
  const [hardwareClassName, setHardwareClassName] = useState(''); // display
  const [aliasName, setAliasName] = useState('');
  const [sequenceId, setSequenceId] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [metaFields, setMetaFields] = useState([{ key: '', value: '' }]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // HW class dropdown
  const [hwClasses, setHwClasses] = useState<HardwareClass[]>([]);
  const [hwLoading, setHwLoading] = useState(true);
  const [hwDropOpen, setHwDropOpen] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<CreatedRobot | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    hardwareClassApi.list()
      .then(list => setHwClasses(list.filter(c => c.isActive)))
      .catch(() => {})
      .finally(() => setHwLoading(false));
  }, []);

  // ── Metadata helpers ──
  const updateMeta = (i: number, f: 'key' | 'value', v: string) => {
    const next = [...metaFields];
    next[i][f] = v;
    setMetaFields(next);
  };
  const addMeta = () => setMetaFields([...metaFields, { key: '', value: '' }]);
  const removeMeta = (i: number) => {
    if (metaFields.length === 1) { setMetaFields([{ key: '', value: '' }]); return; }
    setMetaFields(metaFields.filter((_, idx) => idx !== i));
  };
  const hasMetaData = metaFields.some(f => f.key.trim() || f.value.trim());

  // ── Validation ──
  const validate = () => {
    const e: Record<string, string> = {};
    if (!hardwareName.trim()) e.hardwareName = 'Hardware name is required';
    else if (hardwareName.trim().length > 100) e.hardwareName = 'Max 100 characters';
    if (!hardwareClass) e.hardwareClass = 'Hardware class is required';
    if (!aliasName.trim()) e.aliasName = 'Alias is required';
    else if (aliasName.trim().length > 100) e.aliasName = 'Max 100 characters';
    if (!sequenceId.trim()) e.sequenceId = 'Sequence ID is required';
    else if (!Number.isInteger(Number(sequenceId)) || Number(sequenceId) < 1) e.sequenceId = 'Must be a positive integer';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    else if (password.length > 100) e.password = 'Max 100 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setApiError('');
    if (!validate()) return;

    const metaData: Record<string, string> = {};
    metaFields.forEach(f => {
      if (f.key.trim() && f.value.trim()) metaData[f.key.trim()] = f.value.trim();
    });

    setIsSubmitting(true);
    try {
      const { data } = await client.post('/admin/robot/create', {
        hardwareName: hardwareName.trim(),
        hardwareClass,
        aliasName: aliasName.trim(),
        sequenceId: Number(sequenceId),
        description: description.trim() || undefined,
        password,
        simulated,
        ...(Object.keys(metaData).length > 0 ? { metaData } : {}),
      });

      const res = data as any;
      const robot = res?.data ?? res;
      setSuccessData({
        hardwareName: robot?.hardwareName ?? hardwareName.trim(),
        sequenceId: robot?.sequenceId ?? sequenceId,
        apiKey: robot?.apiKey ?? '',
        id: robot?._id ?? robot?.id ?? '',
        roomId: robot?.roomId ?? '',
      });
      setShowSuccess(true);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Failed to create robot.';
      setApiError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    setShowSuccess(false);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add a Robot</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Card 1: Main Fields ── */}
        <View style={styles.card}>
          {/* Hardware Name */}
          <Field label="Hardware Name*" error={errors.hardwareName}>
            <TextInput
              style={[styles.input, errors.hardwareName && styles.inputError]}
              value={hardwareName}
              onChangeText={v => { setHardwareName(v); if (errors.hardwareName) setErrors(p => ({ ...p, hardwareName: '' })); }}
              placeholder="Enter Hardware Name"
              placeholderTextColor={Colors.textSecondary}
              maxLength={100}
            />
          </Field>

          {/* Hardware Class dropdown */}
          <Field label="Hardware Class*" error={errors.hardwareClass}>
            <TouchableOpacity
              style={[styles.dropdown, errors.hardwareClass && styles.inputError]}
              onPress={() => setHwDropOpen(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={hardwareClass ? styles.dropdownSelected : styles.dropdownPlaceholder} numberOfLines={1}>
                {hardwareClass ? hardwareClassName : 'Select Hardware Class'}
              </Text>
              <Text style={[styles.chevron, hwDropOpen && styles.chevronUp]}>›</Text>
            </TouchableOpacity>

            {hwDropOpen && (
              <View style={styles.dropList}>
                {hwLoading ? (
                  <Text style={styles.dropMuted}>Loading...</Text>
                ) : hwClasses.length === 0 ? (
                  <Text style={styles.dropMuted}>No hardware classes found</Text>
                ) : hwClasses.map(hc => (
                  <TouchableOpacity
                    key={hc._id}
                    style={[styles.dropItem, hardwareClass === hc._id && styles.dropItemActive]}
                    onPress={() => {
                      setHardwareClass(hc._id);
                      setHardwareClassName(hc.name);
                      setHwDropOpen(false);
                      if (errors.hardwareClass) setErrors(p => ({ ...p, hardwareClass: '' }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropItemText}>{hc.name}</Text>
                    {hardwareClass === hc._id && <Text style={styles.dropItemCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Field>

          {/* Simulated toggle */}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Simulated Robot</Text>
            <Switch
              value={simulated}
              onValueChange={setSimulated}
              trackColor={{ false: '#45485B', true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>

          {/* Alias */}
          <Field label="Alias*" error={errors.aliasName}>
            <TextInput
              style={[styles.input, errors.aliasName && styles.inputError]}
              value={aliasName}
              onChangeText={v => { setAliasName(v); if (errors.aliasName) setErrors(p => ({ ...p, aliasName: '' })); }}
              placeholder="Enter Alias"
              placeholderTextColor={Colors.textSecondary}
              maxLength={100}
            />
          </Field>

          {/* Sequence ID */}
          <Field label="Sequence ID*" error={errors.sequenceId}>
            <TextInput
              style={[styles.input, errors.sequenceId && styles.inputError]}
              value={sequenceId}
              onChangeText={v => {
                if (/^\d*$/.test(v)) {
                  setSequenceId(v);
                  if (errors.sequenceId) setErrors(p => ({ ...p, sequenceId: '' }));
                }
              }}
              placeholder="Enter Sequence ID"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
            />
          </Field>

          {/* Description */}
          <Field label="Description (Optional)">
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter Robot Description"
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          {/* Password */}
          <Field label="Password*" error={errors.password}>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                value={password}
                onChangeText={v => { setPassword(v); if (errors.password) setErrors(p => ({ ...p, password: '' })); }}
                placeholder="Enter Your Password"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry={!showPassword}
                maxLength={100}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </Field>
        </View>

        {/* ── Card 2: Metadata ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Robot Metadata (Optional)</Text>

          {/* Column headers */}
          <View style={styles.metaHeaderRow}>
            <Text style={styles.metaHeaderLabel}>Key</Text>
            <Text style={styles.metaHeaderLabel}>Value</Text>
            <View style={{ width: 42 }} />
          </View>

          {/* Metadata rows */}
          {metaFields.map((field, i) => {
            const isOnlyEmpty = metaFields.length === 1 && !field.key.trim() && !field.value.trim();
            return (
              <View key={i} style={styles.metaRow}>
                <TextInput
                  style={[styles.input, styles.metaInput]}
                  value={field.key}
                  onChangeText={v => updateMeta(i, 'key', v)}
                  placeholder="Enter the Key"
                  placeholderTextColor={Colors.textSecondary}
                />
                <TextInput
                  style={[styles.input, styles.metaInput]}
                  value={field.value}
                  onChangeText={v => updateMeta(i, 'value', v)}
                  placeholder="Enter the Value"
                  placeholderTextColor={Colors.textSecondary}
                />
                {isOnlyEmpty ? (
                  <TouchableOpacity style={styles.metaAddBtn} onPress={addMeta} activeOpacity={0.8}>
                    <Text style={styles.metaAddIcon}>+</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.metaDelBtn} onPress={() => removeMeta(i)} activeOpacity={0.8}>
                    <Text style={styles.metaDelIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Add Metadata button (shows only when there's data) */}
          {hasMetaData && (
            <TouchableOpacity style={styles.addMetaBtn} onPress={addMeta} activeOpacity={0.8}>
              <Text style={styles.addMetaBtnText}>+ Add Meta Data</Text>
            </TouchableOpacity>
          )}

          {/* API error */}
          {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.65 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitBtnText}>Add a Robot</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SuccessModal visible={showSuccess} data={successData} onDone={handleDone} />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.sidebar,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, alignItems: 'center', justifyContent: 'center' },
  backArrow: {
    color: Colors.text,
    fontSize: 28,
    lineHeight: 28,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  headerTitle: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#191A1E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 14,
  },
  cardTitle: {
    color: Colors.text, fontSize: 15, fontWeight: '600',
    marginBottom: 2,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    marginHorizontal: -16, paddingHorizontal: 16,
  },
  input: {
    backgroundColor: '#212227',
    borderRadius: 8, borderWidth: 1, borderColor: '#2e3040',
    color: Colors.text, fontSize: 14,
    paddingHorizontal: 12, height: 42,
  },
  inputError: { borderColor: '#da1e28' },
  inputMulti: { height: 80, paddingTop: 10 },
  dropdown: {
    backgroundColor: '#212227',
    borderRadius: 8, borderWidth: 1, borderColor: '#2e3040',
    height: 42,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12,
  },
  dropdownSelected: { flex: 1, color: Colors.text, fontSize: 14 },
  dropdownPlaceholder: { flex: 1, color: Colors.textSecondary, fontSize: 14 },
  chevron: {
    color: Colors.textSecondary, fontSize: 20, lineHeight: 22,
    transform: [{ rotate: '90deg' }],
  },
  chevronUp: { transform: [{ rotate: '-90deg' }] },
  dropList: {
    marginTop: 4,
    backgroundColor: '#212227',
    borderRadius: 8, borderWidth: 1, borderColor: '#2e3040',
    maxHeight: 180, overflow: 'hidden',
    zIndex: 100,
  },
  dropItem: {
    paddingHorizontal: 12, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropItemActive: { backgroundColor: '#2a2d38' },
  dropItemText: { color: Colors.text, fontSize: 14 },
  dropItemCheck: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  dropMuted: { color: Colors.textSecondary, fontSize: 13, padding: 12 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 2,
  },
  switchLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute', right: 6, top: 6,
    width: 30, height: 30,
    backgroundColor: '#2e3040', borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  eyeIcon: { fontSize: 14 },
  metaHeaderRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  metaHeaderLabel: { flex: 1, color: Colors.textSecondary, fontSize: 12 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  metaInput: { flex: 1, fontSize: 13 },
  metaAddBtn: {
    width: 42, height: 42,
    backgroundColor: '#313447', borderRadius: 8,
    borderWidth: 1, borderColor: '#3b3e51',
    alignItems: 'center', justifyContent: 'center',
  },
  metaAddIcon: { color: '#fff', fontSize: 20, lineHeight: 22 },
  metaDelBtn: {
    width: 42, height: 42,
    backgroundColor: 'rgba(218,30,40,0.1)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(218,30,40,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  metaDelIcon: { color: '#ff4444', fontSize: 14 },
  addMetaBtn: {
    height: 42, backgroundColor: '#212227',
    borderRadius: 8, borderWidth: 1, borderColor: '#2e3040',
    alignItems: 'center', justifyContent: 'center',
  },
  addMetaBtnText: { color: Colors.text, fontSize: 13, fontWeight: '500' },
  apiError: { color: '#ff4444', fontSize: 13, textAlign: 'center' },
  submitBtn: {
    height: 44, backgroundColor: Colors.primary,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

const fs = StyleSheet.create({
  group: { gap: 6 },
  label: { color: '#9aa1b3', fontSize: 13, fontWeight: '500' },
  error: { color: '#da1e28', fontSize: 12, marginTop: 2 },
});

const ss = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#191A1E',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1, borderColor: Colors.primaryBorder,
    width: '100%', maxWidth: 440,
    gap: 16,
  },
  title: {
    color: Colors.primary, fontSize: 20, fontWeight: '700', textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18,
  },
  credBox: {
    backgroundColor: Colors.card,
    borderRadius: 14, padding: 16, gap: 14,
  },
  credRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  robotIcon: {
    width: 44, height: 44,
    backgroundColor: Colors.primaryDim, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  robotIconText: { color: Colors.primary, fontSize: 20, fontWeight: '700' },
  credName: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  credSub: { color: Colors.textSecondary, fontSize: 12 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  credLabel: { color: Colors.textSecondary, fontSize: 12, marginBottom: 2 },
  credValue: { color: Colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  copyBtn: {
    width: 26, height: 26,
    backgroundColor: Colors.card, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  copyIcon: { color: Colors.textSecondary, fontSize: 14 },
  btns: { flexDirection: 'row', gap: 10 },
  doneBtn: {
    flex: 1, height: 42,
    backgroundColor: Colors.card, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  dlBtn: {
    width: 100, height: 42,
    backgroundColor: Colors.primary, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  dlBtnText: { color: '#fff', fontSize: 18 },
});
