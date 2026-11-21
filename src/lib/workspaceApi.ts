import { StudyPlan } from './types';

async function workspaceFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const errObj = data.error as { message?: string; status?: string; code?: number } | undefined;
    const message = errObj?.message || (typeof data.message === 'string' ? data.message : '') || `HTTP ${res.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return data as T;
}

// 1. Google Drive
export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export async function listDriveFiles(token: string, queryText?: string): Promise<DriveFileItem[]> {
  const qParts = ['trashed = false'];
  if (queryText?.trim()) {
    const safe = queryText.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${safe}'`);
  }
  const params = new URLSearchParams({
    pageSize: '20',
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    orderBy: 'modifiedTime desc',
    q: qParts.join(' and '),
  });
  const data = await workspaceFetch<{ files?: DriveFileItem[] }>(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    token
  );
  return data.files ?? [];
}

export async function createDriveTextFile(
  token: string,
  fileName: string,
  content: string
): Promise<DriveFileItem> {
  const metadata = {
    name: fileName,
    mimeType: 'text/plain',
  };
  const boundary = 'edusmart_drive_boundary_2026';
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`;

  return workspaceFetch<DriveFileItem>(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    token,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
}

// 2. Google Sheets
export async function createStudyPlanSheet(
  token: string,
  title: string,
  plans: StudyPlan[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const sheetTitle = 'KeHoachTuHoc';
  const created = await workspaceFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  }>('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: sheetTitle } }],
    }),
  });

  const actualTabName = created.sheets?.[0]?.properties?.title || sheetTitle;
  const rows: string[][] = [
    ['Môn học', 'Nhiệm vụ', 'Mục tiêu', 'Thời lượng dự kiến (phút)', 'Thực tế (phút)', 'Hạn hoàn thành', 'Trạng thái', 'Tự đánh giá'],
    ...plans.map((p) => [
      p.subject,
      p.title,
      p.goal,
      String(p.targetMinutes),
      String(p.actualMinutes),
      p.dueDate,
      p.status,
      p.reflection || '',
    ]),
  ];

  const encodedRange = encodeURIComponent(`${actualTabName}!A1:H${rows.length}`);
  await workspaceFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(created.spreadsheetId)}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    }
  );

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
  };
}

export async function readSpreadsheetPreview(
  token: string,
  spreadsheetId: string
): Promise<{ title: string; tabName: string; values: string[][] }> {
  const safeId = encodeURIComponent(spreadsheetId.trim());
  const meta = await workspaceFetch<{
    properties?: { title?: string };
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(`https://sheets.googleapis.com/v4/spreadsheets/${safeId}?fields=properties.title,sheets.properties.title`, token);

  const tabName = meta.sheets?.[0]?.properties?.title;
  if (!tabName) {
    return { title: meta.properties?.title || 'Bảng tính', tabName: '', values: [] };
  }

  const range = encodeURIComponent(`${tabName}!A1:H15`);
  const data = await workspaceFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${safeId}/values/${range}`,
    token
  );
  return {
    title: meta.properties?.title || 'Bảng tính',
    tabName,
    values: data.values ?? [],
  };
}

// 3. Google Docs
export async function createStudyDoc(
  token: string,
  title: string,
  bodyContent: string
): Promise<{ documentId: string; documentUrl: string }> {
  const doc = await workspaceFetch<{ documentId: string }>('https://docs.googleapis.com/v1/documents', token, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

  if (bodyContent.trim()) {
    await workspaceFetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(doc.documentId)}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: bodyContent,
              },
            },
          ],
        }),
      }
    );
  }

  return {
    documentId: doc.documentId,
    documentUrl: `https://docs.google.com/document/d/${doc.documentId}/edit`,
  };
}

// 4. Google Slides
export async function createLessonSlides(
  token: string,
  title: string,
  summaryLines: string[]
): Promise<{ presentationId: string; presentationUrl: string }> {
  const pres = await workspaceFetch<{
    presentationId: string;
    slides?: Array<{ objectId: string; pageElements?: Array<{ objectId: string; shape?: { placeholder?: { type?: string } } }> }>;
  }>('https://slides.googleapis.com/v1/presentations', token, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

  const firstSlide = pres.slides?.[0];
  const titleBox = firstSlide?.pageElements?.find((el) => el.shape?.placeholder?.type === 'CENTERED_TITLE');
  const subBox = firstSlide?.pageElements?.find((el) => el.shape?.placeholder?.type === 'SUBTITLE');

  const requests: Array<Record<string, unknown>> = [];
  if (titleBox?.objectId) {
    requests.push({
      insertText: { objectId: titleBox.objectId, text: title },
    });
  }
  if (subBox?.objectId) {
    requests.push({
      insertText: {
        objectId: subBox.objectId,
        text: 'EDU SMART • Trường PTDTNT THPT Quảng Nam',
      },
    });
  }

  const contentSlideId = 'edusmart_summary_slide_1';
  const contentBoxId = 'edusmart_summary_box_1';
  requests.push({
    createSlide: {
      objectId: contentSlideId,
      insertionIndex: 1,
      slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
    },
  });
  requests.push({
    createShape: {
      objectId: contentBoxId,
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: contentSlideId,
        size: {
          width: { magnitude: 600, unit: 'PT' },
          height: { magnitude: 300, unit: 'PT' },
        },
        transform: {
          scaleX: 1,
          scaleY: 1,
          translateX: 50,
          translateY: 90,
          unit: 'PT',
        },
      },
    },
  });
  requests.push({
    insertText: {
      objectId: contentBoxId,
      text: summaryLines.join('\n\n'),
    },
  });

  await workspaceFetch(
    `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(pres.presentationId)}:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ requests }),
    }
  );

  return {
    presentationId: pres.presentationId,
    presentationUrl: `https://docs.google.com/presentation/d/${pres.presentationId}/edit`,
  };
}

// 5. Google Forms
export async function createSelfTestForm(
  token: string,
  title: string,
  questions: string[]
): Promise<{ formId: string; responderUri: string; editUrl: string }> {
  const form = await workspaceFetch<{ formId: string; responderUri: string }>(
    'https://forms.googleapis.com/v1/forms',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        info: {
          title,
          documentTitle: title,
        },
      }),
    }
  );

  const requests = questions.map((q, index) => ({
    createItem: {
      item: {
        title: q,
        questionItem: {
          question: {
            required: true,
            textQuestion: { paragraph: true },
          },
        },
      },
      location: { index },
    },
  }));

  if (requests.length > 0) {
    await workspaceFetch(
      `https://forms.googleapis.com/v1/forms/${encodeURIComponent(form.formId)}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );
  }

  return {
    formId: form.formId,
    responderUri: form.responderUri,
    editUrl: `https://docs.google.com/forms/d/${form.formId}/edit`,
  };
}

export async function getFormResponsesSummary(
  token: string,
  formId: string
): Promise<{ count: number; latestTimestamp?: string }> {
  const safeFormId = encodeURIComponent(formId.trim());
  const data = await workspaceFetch<{ responses?: Array<{ lastSubmittedTime?: string }> }>(
    `https://forms.googleapis.com/v1/forms/${safeFormId}/responses`,
    token
  );
  const responses = data.responses ?? [];
  return {
    count: responses.length,
    latestTimestamp: responses[0]?.lastSubmittedTime,
  };
}

// 6. Gmail
export interface GmailMessagePreview {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
}

export async function listGmailMessages(token: string, maxResults = 8): Promise<GmailMessagePreview[]> {
  const listData = await workspaceFetch<{ messages?: Array<{ id: string }> }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    token
  );
  const ids = listData.messages ?? [];
  const previews = await Promise.all(
    ids.slice(0, maxResults).map(async ({ id }) => {
      const msg = await workspaceFetch<{
        id: string;
        snippet?: string;
        payload?: { headers?: Array<{ name: string; value: string }> };
      }>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        token
      );
      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      return {
        id: msg.id,
        subject: getHeader('Subject') || '(Không có tiêu đề)',
        from: getHeader('From') || 'Không rõ người gửi',
        date: getHeader('Date') || '',
        snippet: msg.snippet || '',
      };
    })
  );
  return previews;
}

function encodeBase64UrlUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeMimeSubject(subject: string): string {
  const bytes = new TextEncoder().encode(subject);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export async function sendGmailMessage(
  token: string,
  to: string,
  subject: string,
  bodyText: string
): Promise<{ id: string }> {
  const rawEmail = [
    `To: ${to.trim()}`,
    `Subject: ${encodeMimeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    bodyText,
  ].join('\r\n');

  return workspaceFetch<{ id: string }>('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({
      raw: encodeBase64UrlUtf8(rawEmail),
    }),
  });
}

// 7. Google Chat
export interface ChatSpaceItem {
  name: string;
  displayName?: string;
  spaceType?: string;
}

export interface ChatMessageItem {
  name: string;
  text?: string;
  createTime?: string;
  sender?: { displayName?: string; type?: string };
}

export async function listChatSpaces(token: string): Promise<ChatSpaceItem[]> {
  const data = await workspaceFetch<{ spaces?: ChatSpaceItem[] }>(
    'https://chat.googleapis.com/v1/spaces?pageSize=20',
    token
  );
  return data.spaces ?? [];
}

export async function listChatMessages(token: string, spaceName: string): Promise<ChatMessageItem[]> {
  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  const data = await workspaceFetch<{ messages?: ChatMessageItem[] }>(
    `https://chat.googleapis.com/v1/${cleanSpace}/messages?pageSize=20`,
    token
  );
  return data.messages ?? [];
}

export async function sendChatMessage(
  token: string,
  spaceName: string,
  text: string
): Promise<ChatMessageItem> {
  const cleanSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
  return workspaceFetch<ChatMessageItem>(`https://chat.googleapis.com/v1/${cleanSpace}/messages`, token, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// 8. Google Contacts (People API)
export interface ContactItem {
  resourceName: string;
  name: string;
  email: string;
  organization?: string;
}

export async function listContacts(token: string): Promise<ContactItem[]> {
  const data = await workspaceFetch<{
    connections?: Array<{
      resourceName: string;
      names?: Array<{ displayName?: string }>;
      emailAddresses?: Array<{ value?: string }>;
      organizations?: Array<{ name?: string }>;
    }>;
  }>(
    'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,organizations&pageSize=30',
    token
  );

  return (data.connections ?? [])
    .map((person) => ({
      resourceName: person.resourceName,
      name: person.names?.[0]?.displayName || 'Chưa đặt tên',
      email: person.emailAddresses?.[0]?.value || '',
      organization: person.organizations?.[0]?.name || '',
    }))
    .filter((c) => Boolean(c.email));
}
