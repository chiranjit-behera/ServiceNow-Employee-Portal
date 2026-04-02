import serviceNowClient from './serviceNowClient';

const SYS_USER_FIELDS =
  'sys_id,name,user_name,email,title,department,location,company,bio,phone,mobile_phone,time_zone,photo';

export const fetchUserProfile = async (userSysId) => {
  const res = await serviceNowClient.get(`/table/sys_user/${userSysId}`, {
    params: {
      sysparm_display_value: true,
      sysparm_fields: SYS_USER_FIELDS,
    },
  });
  return res?.data?.result || {};
};

export const updateUserProfile = async (userSysId, profileData) => {
  const cleaned = Object.fromEntries(
    Object.entries(profileData).filter(([, v]) => v !== undefined)
  );

  const res = await serviceNowClient.patch(`/table/sys_user/${userSysId}`, cleaned, {
    params: {
      sysparm_display_value: true,
      sysparm_input_display_value: true,
      sysparm_fields: SYS_USER_FIELDS,
    },
  });

  return res?.data?.result || {};
};

