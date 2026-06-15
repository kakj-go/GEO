package constants

import "strings"

const UserID = "userID"

const CompanyID = "companyID"

const Username = "username"

const Exp = "exp"

const RootUserID = 1

type WebsitePlatform string

type WebsitePurpose string

const (
	JinRiTouTiaoWebsitePlatform WebsitePlatform = "jin_ri_tou_tiao"
	XiaoHongShuWebsitePlatform  WebsitePlatform = "xiao_hong_shu"
	SouHuHaoWebsitePlatform     WebsitePlatform = "sou_hu_hao"
	KuaiShouWebsitePlatform     WebsitePlatform = "kuai_shou"
	BaiJiaHaoWebsitePlatform    WebsitePlatform = "bai_jia_hao"
	DouYinWebsitePlatform       WebsitePlatform = "dou_yin"
	TikTokWebsitePlatform       WebsitePlatform = "tik_tok"
	ZhihuWebsitePlatform        WebsitePlatform = "zhihu"
	BilibiliWebsitePlatform     WebsitePlatform = "bilibili"
	CSDNWebsitePlatform         WebsitePlatform = "csdn"
	WeiXinWebsitePlatform       WebsitePlatform = "weixin"
	//JianShuWebsitePlatform      WebsitePlatform = "jianshu"
	WangYiWebsitePlatform WebsitePlatform = "wangyi"
	QiEWebsitePlatform    WebsitePlatform = "qie"
)

func (w WebsitePlatform) GetName() string {
	switch w {
	case KuaiShouWebsitePlatform:
		return "快手"
	case SouHuHaoWebsitePlatform:
		return "搜狐号"
	case JinRiTouTiaoWebsitePlatform:
		return "今日头条"
	case XiaoHongShuWebsitePlatform:
		return "小红书"
	case BaiJiaHaoWebsitePlatform:
		return "百家号"
	case TikTokWebsitePlatform:
		return "TikTok"
	case DouYinWebsitePlatform:
		return "抖音"
	case ZhihuWebsitePlatform:
		return "知乎"
	case BilibiliWebsitePlatform:
		return "哔哩哔哩"
	case CSDNWebsitePlatform:
		return "CSDN"
	case WeiXinWebsitePlatform:
		return "公众号"
	//case JianShuWebsitePlatform:
	//	return "简书"
	case WangYiWebsitePlatform:
		return "网易号"
	case QiEWebsitePlatform:
		return "企鹅号"
	}
	return "未知"
}

const (
	//ImagePurpose   WebsitePurpose = "image"
	VideoPurpose   WebsitePurpose = "video"
	AiPurpose      WebsitePurpose = "ai"
	ArticlePurpose WebsitePurpose = "article"
)

func (w WebsitePurpose) GetName() string {
	switch w {
	case AiPurpose:
		return "大模型"
	case VideoPurpose:
		return "短视频"
	//case ImagePurpose:
	//	return "图文"
	case ArticlePurpose:
		return "文章"
	}
	return "未知"
}

// IsValidPlatform 校验 Platform 是否在枚举中
func IsValidPlatform(platform string) bool {
	if len(strings.TrimSpace(platform)) == 0 {
		return false
	}

	validPlatforms := map[WebsitePlatform]bool{
		JinRiTouTiaoWebsitePlatform: true,
		XiaoHongShuWebsitePlatform:  true,
		SouHuHaoWebsitePlatform:     true,
		KuaiShouWebsitePlatform:     true,
		BaiJiaHaoWebsitePlatform:    true,
		DouYinWebsitePlatform:       true,
		TikTokWebsitePlatform:       true,
		ZhihuWebsitePlatform:        true,
		BilibiliWebsitePlatform:     true,
		CSDNWebsitePlatform:         true,
		WangYiWebsitePlatform:       true,
		WeiXinWebsitePlatform:       true,
		QiEWebsitePlatform:          true,
	}

	_, exists := validPlatforms[WebsitePlatform(platform)]
	return exists
}

type WebsiteInfo struct {
	Platform     WebsitePlatform  `json:"platform" validate:"required"`
	Purposes     []WebsitePurpose `json:"purposes" validate:"required"`
	PlatformName string           `json:"platformName" validate:"required"`
	PurposeNames []string         `json:"purposeNames" validate:"required"`
	LoginUrl     string           `json:"loginUrl" validate:"required"`
	PageUrl      string           `json:"pageUrl" validate:"required"`
}

var WebsiteInfoMap = []WebsiteInfo{
	{
		Platform:     XiaoHongShuWebsitePlatform,
		Purposes:     []WebsitePurpose{VideoPurpose, ArticlePurpose},
		PlatformName: XiaoHongShuWebsitePlatform.GetName(),
		PurposeNames: []string{VideoPurpose.GetName(), ArticlePurpose.GetName()},
		LoginUrl:     "https://creator.xiaohongshu.com/login",
		PageUrl:      "https://creator.xiaohongshu.com/new/home",
	},
	{
		Platform:     JinRiTouTiaoWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: JinRiTouTiaoWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://mp.toutiao.com/auth/page/login",
		PageUrl:      "https://mp.toutiao.com/profile_v4/index",
	},
	{
		Platform:     SouHuHaoWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: SouHuHaoWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://mp.sohu.com/mpfe/v4/login",
		PageUrl:      "https://mp.sohu.com/mpfe/v4/contentManagement/first/page",
	},
	{
		Platform:     DouYinWebsitePlatform,
		Purposes:     []WebsitePurpose{VideoPurpose, ArticlePurpose},
		PlatformName: DouYinWebsitePlatform.GetName(),
		PurposeNames: []string{VideoPurpose.GetName(), ArticlePurpose.GetName()},
		LoginUrl:     "https://creator.douyin.com/login",
		PageUrl:      "https://creator.douyin.com/creator-micro/home",
	},
	{
		Platform:     KuaiShouWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose, VideoPurpose},
		PlatformName: KuaiShouWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName(), VideoPurpose.GetName()},
		LoginUrl:     "https://passport.kuaishou.com/pc/account/login/?sid=kuaishou.web.cp.api&callback=https%3A%2F%2Fcp.kuaishou.com%2Frest%2Finfra%2Fsts%3FfollowUrl%3Dhttps%253A%252F%252Fcp.kuaishou.com%252Fprofile%26setRootDomain%3Dtrue",
		PageUrl:      "https://cp.kuaishou.com/profile",
	},
	{
		Platform:     TikTokWebsitePlatform,
		Purposes:     []WebsitePurpose{VideoPurpose},
		PlatformName: TikTokWebsitePlatform.GetName(),
		PurposeNames: []string{VideoPurpose.GetName()},
		LoginUrl:     "https://www.tiktok.com/login?redirect_url=https%3A%2F%2Fwww.tiktok.com%2Ftiktokstudio&enter_method=redirect&enter_from=tiktokstudio",
		PageUrl:      "https://www.tiktok.com/tiktokstudio",
	},
	{
		Platform:     ZhihuWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: ZhihuWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://www.zhihu.com/signin",
		PageUrl:      "https://www.zhihu.com",
	},
	{
		Platform:     BilibiliWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: BilibiliWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://passport.bilibili.com/login",
		PageUrl:      "https://www.bilibili.com",
	},
	{
		Platform:     CSDNWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: CSDNWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://passport.csdn.net/login",
		PageUrl:      "https://www.csdn.net",
	},
	{
		Platform:     WeiXinWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: WeiXinWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://mp.weixin.qq.com",
		PageUrl:      "https://mp.weixin.qq.com/cgi-bin/home",
	},
	//{
	//	Platform:     JianShuWebsitePlatform,
	//	Purposes:     []WebsitePurpose{ArticlePurpose},
	//	PlatformName: JianShuWebsitePlatform.GetName(),
	//	PurposeNames: []string{ArticlePurpose.GetName()},
	//	LoginUrl:     "https://www.jianshu.com/sign_in",
	//	PageUrl:      "https://www.jianshu.com",
	//},
	{
		Platform:     WangYiWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: WangYiWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://mp.163.com/login.html#/",
		PageUrl:      "https://mp.163.com/subscribe_v4/index.html#/",
	},
	{
		Platform:     QiEWebsitePlatform,
		Purposes:     []WebsitePurpose{ArticlePurpose},
		PlatformName: QiEWebsitePlatform.GetName(),
		PurposeNames: []string{ArticlePurpose.GetName()},
		LoginUrl:     "https://om.qq.com/userAuth/index",
		PageUrl:      "https://om.qq.com/main",
	},
}

var PlatformLimits = map[string]int{
	string(WangYiWebsitePlatform):       6,
	string(SouHuHaoWebsitePlatform):     5,
	string(BaiJiaHaoWebsitePlatform):    15,
	string(JinRiTouTiaoWebsitePlatform): 50,
	string(DouYinWebsitePlatform):       10,
	string(ZhihuWebsitePlatform):        3,
	string(XiaoHongShuWebsitePlatform):  10,
	string(CSDNWebsitePlatform):         15,
	string(BilibiliWebsitePlatform):     10,
	//string(JianShuWebsitePlatform):      2,
	string(QiEWebsitePlatform):      5,
	string(WeiXinWebsitePlatform):   50,
	string(KuaiShouWebsitePlatform): 10,
	string(TikTokWebsitePlatform):   20,
}

func GetPlatformByPurpose(query string) []string {
	var platforms []string
	for _, p := range WebsiteInfoMap {
		for _, purpose := range p.Purposes {
			if purpose == WebsitePurpose(query) {
				platforms = append(platforms, string(p.Platform))
			}
		}
	}
	return platforms
}
