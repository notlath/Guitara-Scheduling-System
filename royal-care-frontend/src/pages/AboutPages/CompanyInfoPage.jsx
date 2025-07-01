import { useEffect } from "react";
import PageLayout from "../../globals/PageLayout";
import LayoutRow from "../../globals/LayoutRow";
import pageTitles from "../../constants/pageTitles";
import HistorySection from "../../components/CompanyInfo/HistorySection";
import MissionVisionSection from "../../components/CompanyInfo/MissionVisionSection";
import TeamSection from "../../components/CompanyInfo/TeamSection";
import ServiceAreasSection from "../../components/CompanyInfo/ServiceAreasSection";
import CSRSection from "../../components/CompanyInfo/CSRSection";
import "../../styles/CompanyInfo.css";

const CompanyInfoPage = () => {
  useEffect(() => {
    document.title = pageTitles.companyInfo;
  }, []);

  return (
    <PageLayout>
      <LayoutRow
        title="Royal Care"
        subtitle="Premium Home-based Massage & Wellness Service - Transforming Lives Since 2010"
      />
      <div className="company-info-container">
        <div className="company-info-content">
          <div className="company-info-body">
            <HistorySection />
            <MissionVisionSection />
            <TeamSection />
            <ServiceAreasSection />
            <CSRSection />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default CompanyInfoPage;
