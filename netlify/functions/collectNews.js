const axios = require('axios');

// 환경 변수 설정
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const JANDI_WEBHOOK_URL = process.env.JANDI_WEBHOOK_URL;

// 투자사 목록
const companies = [
  '소프트뱅크벤처스',
  '카카오벤처스',
  '네이버디앤에프',
  '스톤브릿지벤처스',
  '알토스벤처스',
  '프리미어파트너스',
  '케이큐브벤처스',
  '스마일게이트인베스트먼트',
  '크래프톤벤처스',
  '캡스톤파트너스',
  '에이티넘인베스트먼트',
  '케이원인베스트먼트',
  'DSC인베스트먼트',
  'KB인베스트먼트',
  '코오롱인베스트먼트',
  '티에스인베스트먼트',
  '포스코기술투자',
  '한국투자파트너스',
  '현대기술투자',
  'LB인베스트먼트',
  'IMM인베스트먼트',
  'DSC인베스트먼트',
  'BRV캐피탈',
  'CKD창업투자',
  'IMM인베스트먼트',
  'KDB인베스트먼트',
  'LG테크노인베스트먼트',
  'NH투자증권',
  'SK증권',
  'SV인베스트먼트'
];

exports.handler = async function(event, context) {
  try {
    await collectNews();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'News collection completed successfully' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to collect news' })
    };
  }
};

async function collectNews() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const start = yesterday.toISOString().split('T')[0];
  const end = today.toISOString().split('T')[0];

  for (const company of companies) {
    try {
      const news = await searchNaverNews(company, start, end);
      if (news.length > 0) {
        await sendToJandi(company, news);
      }
    } catch (error) {
      console.error(`Error collecting news for ${company}:`, error);
    }
  }
}

async function searchNaverNews(company, start, end) {
  const query = encodeURI(company);
  const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=100&sort=date&start=1`;

  const response = await axios.get(url, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
    }
  });

  return response.data.items.filter(item => {
    const pubDate = new Date(item.pubDate);
    const pubDateStr = pubDate.toISOString().split('T')[0];
    return pubDateStr >= start && pubDateStr <= end;
  });
}

async function sendToJandi(company, news) {
  const message = formatJandiMessage(company, news);
  
  try {
    await axios.post(JANDI_WEBHOOK_URL, {
      body: message,
      connectColor: '#FAC11B',
      connectInfo: [{
        title: '네이버 뉴스 검색 결과',
        description: `${company}에 대한 최근 뉴스입니다.`
      }]
    });
  } catch (error) {
    console.error(`Error sending message to Jandi for ${company}:`, error);
    throw error;
  }
}

function formatJandiMessage(company, news) {
  let message = `# ${company} 관련 뉴스\n\n`;
  
  news.forEach((item, index) => {
    const title = item.title.replace(/<[^>]*>/g, '');
    message += `${index + 1}. [${title}](${item.link})\n`;
  });
  
  return message;
} 