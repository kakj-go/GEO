// stores/useUserStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {getCompanyInfo} from "../api";

const useCompanyStore = create(
    persist(
        (set, get) => ({
            company: null,

            CompanyInfo: async (company_id) => {
                console.log("获取公司信息")

                const companyResult = await getCompanyInfo(company_id)

                if (!companyResult.success) {
                    throw new Error(companyResult.message || '登录失败');
                }

                set({
                    company: companyResult.data
                });

                return {
                    success: true,
                    message: '公司信息获取成功',
                    company: companyResult.data
                };
            },

            updateCompanyAvatar: (avatarUrl) => {
                const currentCompany = get().company;
                if (currentCompany) {
                    set({
                        company: { ...currentCompany, avatar: avatarUrl }
                    });
                }
            },

            setCompany: (company) => {
                set({ company });
            },
        }),
        {
            name: 'company-storage',
            partialize: (state) => ({
                company: state.company,
            }),
        }
    )
);

export default useCompanyStore;