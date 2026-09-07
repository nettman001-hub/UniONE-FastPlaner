'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, FileText, Terminal, Code2 } from 'lucide-react';
import { Modal, useToast } from '@/components/ui';
import { SYSTEM_PROMPT, buildPrompt, moreFlowsBlock } from '@/lib/ai/prompts';
import { ARTIFACT_SCHEMA } from '@/lib/ai/schemas';
import { ARTIFACT_LABEL, type ArtifactKey, type Plan } from '@/lib/types';

interface PromptViewerModalProps {
  open: boolean;
  onClose: () => void;
  artifact: ArtifactKey | null;
  plan: Plan;
}

type PromptTab = 'user' | 'system' | 'schema' | 'all';

export function PromptViewerModal({ open, onClose, artifact, plan }: PromptViewerModalProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<PromptTab>('user');
  const [copied, setCopied] = useState(false);

  // 현재 선택된 단계의 사용자 프롬프트 조립
  const userPrompt = useMemo(() => {
    if (!artifact) return '';
    let prompt = buildPrompt(plan, artifact);

    if (artifact === 'wireframe') {
      const targets = plan.iaPages.slice(0, 10);
      if (targets.length > 0) {
        prompt += `\n\n## 와이어프레임을 만들 페이지\n${targets
          .map((p) => `- ${p.id} ${p.name} (${p.path}) — ${p.description}`)
          .join('\n')}`;
      }
    } else if (artifact === 'flow' && plan.flows.length > 0) {
      prompt += `\n\n${moreFlowsBlock(plan)}`;
    }

    return prompt;
  }, [artifact, plan]);

  // 스키마 JSON 문자열
  const schemaString = useMemo(() => {
    if (!artifact) return '';
    try {
      return JSON.stringify(ARTIFACT_SCHEMA[artifact], null, 2);
    } catch {
      return '';
    }
  }, [artifact]);

  // 전체 프롬프트 (시스템 + 사용자)
  const allPrompt = useMemo(() => {
    return `[SYSTEM PROMPT]\n${SYSTEM_PROMPT}\n\n========================================\n[USER PROMPT]\n${userPrompt}`;
  }, [userPrompt]);

  // 현재 활성 탭 텍스트
  const currentText = useMemo(() => {
    switch (activeTab) {
      case 'user':
        return userPrompt;
      case 'system':
        return SYSTEM_PROMPT;
      case 'schema':
        return schemaString;
      case 'all':
        return allPrompt;
    }
  }, [activeTab, userPrompt, schemaString, allPrompt]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast(`${label}이(가) 클립보드에 복사되었습니다.`, 'ok');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('클립보드 복사에 실패했습니다.', 'warn');
    }
  };

  if (!artifact) return null;

  const title = `${ARTIFACT_LABEL[artifact]} 생성 명령(프롬프트) 보기`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="AI 산출물 생성 시 실제로 전달되는 시스템 지침과 사용자 프롬프트입니다. (관리자 전용)"
      width={760}
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void copyText(currentText, '현재 내용')}
          >
            {copied ? <Check size={13} className="text-[var(--ok)]" /> : <Copy size={13} />}
            {copied ? '복사됨' : '현재 탭 복사'}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            닫기
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/* 탭 네비게이션 */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border)] pb-2 text-[12.5px]">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'user' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('user')}
          >
            <FileText size={13} />
            사용자 명령 (User Prompt)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'system' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('system')}
          >
            <Terminal size={13} />
            시스템 지침 (System)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'schema' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('schema')}
          >
            <Code2 size={13} />
            JSON 응답 스키마
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('all')}
          >
            전체 합본
          </button>
        </div>

        {/* 프롬프트 본문 표시 영역 */}
        <div className="relative">
          <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3.5 font-mono text-[11.5px] leading-relaxed break-words whitespace-pre-wrap select-text">
            {currentText}
          </div>
        </div>

        {/* 하단 안내 설명 */}
        <p className="text-[11.5px] text-[var(--fg-subtle)]">
          {activeTab === 'user' &&
            '💡 현재 프로젝트의 서비스 정보(브리프), 사전 질문 응답, 이전 단계의 산출물 컨텍스트가 결합된 실제 명령문입니다.'}
          {activeTab === 'system' &&
            '💡 모든 기획 산출물 생성 시 공통으로 부여되는 기획 전문가 역할 및 원칙 가이드라인입니다.'}
          {activeTab === 'schema' &&
            '💡 모델이 결과물을 정형화된 데이터로 응답하도록 강제하는 JSON 스키마 구조입니다.'}
          {activeTab === 'all' &&
            '💡 시스템 지침과 사용자 명령문 전체를 한곳에 모은 전문입니다. 외부 AI 모델에 직접 입력해 테스트할 때 유용합니다.'}
        </p>
      </div>
    </Modal>
  );
}
