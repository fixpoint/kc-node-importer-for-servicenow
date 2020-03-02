# kc-node-importer-for-servicenow
Kompira cloud Sonar�Ō��o�����m�[�h����ServiceNow�̍\�����Ƃ��ăC���|�[�g����X�N���v�g

## �Z�b�g�A�b�v

### Script Include�o�^

ServiceNow�Ǘ���ʂ���A `System definition` => `Script Include` �Ɉړ��B
�uNew�v���N���b�N���A���L�̒ʂ���͂��ASubmit�œo�^����B

- Name: `KcNodeImporter` (�K�����̖��O�B�ύX����Ɠ��삵�܂���)
- Description: `Script to import Kompira cloud node into CMDB`
- Script: �������Ă��� `KcNodeImporter.js` �̒��g�����̂܂܃R�s�y

### Scheduled Jobs�o�^

ServiceNow�Ǘ���ʂ���A `System definition` => `Scheduled Jobs` �Ɉړ��B
�uNew�v���N���b�N���A `Automatically run a script of your choosing` ��I���A���̉�ʂɂĉ��L�̒ʂ���͂��ASubmit�œo�^����B

- Name: �K���ȃW���u��( `Kompira cloud sync` ��)
- Run: ������s�������Ԋu��ݒ�
- Run this script: �������Ă��� `ScheduledScript_Sample.js` �̒��g���R�s�y���A���L�̕����������̃X�y�[�X���ɏ���������
    - `{Kompira cloud API token}` : Kompira cloud��API�g�[�N��
    - `�Ǘ��m�[�h���X�g��URL` : �����������Ǘ��m�[�h�ꗗ��URL
      KC���Ƀl�b�g���[�N���������݂���ꍇ�́A�����L�q���邱�Ƃł܂Ƃ߂ăC���|�[�g���\
      �܂��A`[ServiceNow domain name]` ���w�肷�邱�ƂŃl�b�g���[�N���ɈقȂ�ServiceNow�h���C���ɃC���|�[�g���\

���A������Kompira cloud�X�y�[�X����C���|�[�g����ꍇ�́A�X�y�[�X���W���u��o�^���邱�ƂŃC���|�[�g���s���B


## ���̑��⑫����

### �蓮���s

��LScheduled Jobs�ɓo�^�����W���u���J���A�uExecute Now�v�Ŏ��s�B
�������́A `Scripts - Background` �ɏ�L�W���u�̃X�N���v�g��\��t���Ď��s�ł��B


### ���m�̖��E�y�юd�l

- Kompira cloud���̃m�[�hID�i�[�Ɂu���Y�Ǘ��ԍ�(Asset tag)�v�J�������g�p���Ă��܂�
  �{�J�����ɂ����Kc���m�[�h�̊Ǘ����s���Ă��邽�߁A�C�ӂ̒l�ɏ����������ꍇ�͐���ɓ��삵�܂���B
- Kc�m�[�h�ɓo�^����Ă���u�m�[�g�v�ɂ��ẮAComments�J�����ɏ������܂�܂�
  �������ASN���ɕ��������������邽�߁A4000�����ȏ�̏ꍇ�͐؂�̂Ă��܂��B
  �܂��ALinux�T�[�o�[�ȊO�ł�SN���̉�ʎd�l�ɂ��AComments���̂��\������܂���(�f�[�^�Ƃ��Ă͓����Ă��܂�)
- Hostname�ɂ��Ă�DNS�ɂ�薼�O�����ł���ꍇ�̂ݓ���܂�(Kc���d�l)
- Manufacturer, Model ID, CPU manufacturer�ɂ��ẮA���݂��Ȃ��ꍇ�Y���e�[�u���ɐV�K�f�[�^���ǉ�����܂�
