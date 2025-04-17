const axios = require('axios');

// 환경 변수 설정
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const JANDI_WEBHOOK_URL = process.env.JANDI_WEBHOOK_URL;

// axios 기본 설정
const axiosInstance = axios.create({
  timeout: 5000, // 5초 타임아웃으로 줄임
  headers: {
    'X-Naver-Client-Id': NAVER_CLIENT_ID,
    'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
  }
});

// 투자사 목록
const companies = [
  '브리즘',
  '브라이토닉스이미징',
  'MEDiC',
  '카이젠',
  '폴리페놀팩토리',
  '브이픽스메디칼',
  '임팩트에이아이',
  '에코토르',
  '갤럭스',
  '시안솔루션',
  '바이오솔빅스',
  '초코엔터테인먼트',
  '와이브레인',
  '유니드비티플러스',
  '에이럭스',
  '피피비스튜디오스',
  '메디팹',
  '인제니아',
  '일리아스AI',
  '아모지',
  '텔레픽스',
  'LTIS',
  '브이원텍',
  '이마고웍스',
  '압타머사이언스',
  '큐빅셀',
  '파키스탄혈장',
  '덴컴',
  '베르티스',
  '아스트로젠',
  'S2W',
  '오토위니',
  '피엑스디',
  '엔조이소프트',
  '밸런스히어로',
  '심스테크',
  '진에딧',
  '리브스메드',
  '아이앰히어',
  '웨일브릭',
  '프로티나',
  '닷',
  'SML제니트리',
  '퓨리오젠',
  '케이비즈앤코퍼레이션',
  '케이더블유바이오',
  '베지스타',
  '유리프트',
  '이을바이오',
  '셀락바이오',
  '큐렉스',
  '엔에프티랩스',
  '재영텍',
  '코넥',
  '이을커뮤니케이션아임',
  '아이메디신',
  '에프씨엠티',
  '더삼점영',
  '잇피',
  '이안',
  '에이모',
  '셀쿱스',
  '메디인테크',
  '아이벡스'
];

// 회사별 검색 설정
const companySearchConfig = {
  // 기본 검색: 회사명만 사용
  DEFAULT: {
    useExactMatch: true,  // 정확한 회사명 매칭 사용
  },
  // 특별 검색 설정이 필요한 회사들
  '초코엔터테인먼트': {
    searchKeywords: ['초코엔터테인먼트', '초코엔터', '(주)초코엔터테인먼트'],
    excludeKeywords: ['초코릿', '초코렛', '초콜릿', '초콜렛', '초코과자', '초코파이', '초코케이크'],
    useExactMatch: true,
  },
  '시안솔루션': {
    searchKeywords: ['시안솔루션', '(주)시안솔루션'],
    excludeKeywords: ['시안화', '청산가리'],
    useExactMatch: true,
  },
  '에이럭스': {
    searchKeywords: ['에이럭스', '(주)에이럭스', 'ALUX'],
    excludeKeywords: [],
    useExactMatch: true,
  }
};

exports.handler = async function(event, context) {
  // Lambda 함수 제한시간 설정
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    console.log('Starting news collection...');
    await collectNews();
    console.log('News collection completed successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'News collection completed successfully' })
    };
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ 
        error: 'Failed to collect news',
        message: error.message,
        details: error.response?.data
      })
    };
  }
};

async function collectNews() {
  const now = new Date();
  const today8am = new Date(now);
  today8am.setHours(8, 0, 0, 0);
  
  const yesterday8am = new Date(today8am);
  yesterday8am.setDate(yesterday8am.getDate() - 1);
  
  const searchEnd = now < today8am ? yesterday8am : today8am;
  const searchStart = new Date(searchEnd);
  searchStart.setDate(searchStart.getDate() - 1);

  console.log(`Collecting news from ${searchStart.toISOString()} to ${searchEnd.toISOString()}`);

  // 회사별 뉴스 수집을 5개씩 나누어 처리 (병렬 처리 수 줄임)
  const chunkSize = 5;
  for (let i = 0; i < companies.length; i += chunkSize) {
    const chunk = companies.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(company => processCompanyNews(company, searchStart, searchEnd))
    );
  }
}

async function processCompanyNews(company, startDate, endDate) {
  try {
    const news = await searchNaverNews(company, startDate, endDate);
    if (news && news.length > 0) {
      await sendToJandi(company, news);
      console.log(`Successfully sent ${news.length} news items for ${company}`);
    }
  } catch (error) {
    console.error(`Error processing news for ${company}:`, error.message);
  }
}

async function searchNaverNews(company, startDate, endDate) {
  const searchConfig = companySearchConfig[company] || companySearchConfig.DEFAULT;
  const searchKeywords = searchConfig.searchKeywords || [company];
  const excludeKeywords = searchConfig.excludeKeywords || [];
  
  try {
    // 각 키워드별로 순차적으로 처리 (병렬 처리 제거)
    let allResults = [];
    for (const keyword of searchKeywords) {
      try {
        const query = encodeURI(`"${keyword}"`);
        const url = `https://openapi.naver.com/v1/search/news.json?query=${query}&display=50&sort=date&start=1`; // 결과 수를 50개로 제한

        const response = await axiosInstance.get(url);
        if (response.data && response.data.items) {
          allResults = allResults.concat(response.data.items);
        }
      } catch (error) {
        console.error(`Error searching for keyword ${keyword}:`, error.message);
        continue;
      }
    }

    // 중복 제거 및 필터링
    const uniqueResults = Array.from(new Set(allResults.map(item => item.link)))
      .map(link => allResults.find(item => item.link === link))
      .filter(item => {
        try {
          const pubDate = new Date(item.pubDate);
          if (pubDate < startDate || pubDate >= endDate) return false;

          const cleanTitle = item.title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          const cleanDescription = item.description.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
          
          // 제외 키워드 확인
          if (excludeKeywords.some(keyword => 
            cleanTitle.includes(keyword) || cleanDescription.includes(keyword)
          )) return false;

          // 정확한 매칭 확인
          if (searchConfig.useExactMatch) {
            const exactMatchPattern = new RegExp(
              `(^|[\\s\\(\\[\\{]|[^가-힣\\w])(${searchKeywords.join('|')})($|[\\s\\)\\]\\}]|[^가-힣\\w])`,
              'g'
            );
            
            return exactMatchPattern.test(cleanTitle) || exactMatchPattern.test(cleanDescription);
          }

          return true;
        } catch (error) {
          console.error(`Error processing news item:`, error.message);
          return false;
        }
      });

    return uniqueResults;
  } catch (error) {
    console.error(`Error in searchNaverNews for ${company}:`, error.message);
    return [];
  }
}

async function sendToJandi(company, news) {
  if (!news || news.length === 0) return;

  const message = formatJandiMessage(company, news);
  
  try {
    await axiosInstance.post(JANDI_WEBHOOK_URL, {
      body: message,
      connectColor: '#FAC11B',
      connectInfo: [{
        title: '패스웨이 포트폴리오사 관련 뉴스',
        description: `${company} 관련 최근 뉴스입니다.`
      }]
    });
  } catch (error) {
    console.error(`Error sending message to Jandi for ${company}:`, error.message);
    throw error;
  }
}

function formatJandiMessage(company, news) {
  let message = '# 패스웨이 포트폴리오사 관련 뉴스\n\n';
  
  news.forEach(item => {
    const title = item.title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    const description = item.description.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    message += `**[${company}]**, **${title}**, ${item.link}\n`;
    message += `> ${description}\n\n`;
  });
  
  return message;
} 